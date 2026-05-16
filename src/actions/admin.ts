"use server";

import {
  DeliveryNoteType,
  InventoryMovementKind,
  InvoiceStatus,
  LeadStatus,
  Prisma,
  OfferStatus,
  type UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { calculateTotals, createLowStockNotifications } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import {
  assertOwner,
  assertPermission,
  ensureSystemRoles,
  getPermissionMatrixForRoleRecord,
  isOwnerUser,
  unauthorizedMessage,
} from "@/lib/permissions";
import {
  permissionActions,
  permissionModules,
  type PermissionMatrix,
} from "@/lib/permissions-config";
import { parseMoneyToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  measureSync,
  withActionPerf,
} from "@/lib/perf";
import {
  assetInventorySchema,
  clientSchema,
  debitNoteSchema,
  debitNoteUpdateSchema,
  deliveryNoteItemSchema,
  deliveryNoteSchema,
  deliveryNoteUpdateSchema,
  expenseSchema,
  inventoryAdjustmentSchema,
  invoiceSchema,
  invoiceUpdateSchema,
  leadStatusSchema,
  materialSchema,
  offerItemSchema,
  offerSchema,
  productBomItemSchema,
  quoteRequestStatusSchema,
  productSchema,
  purchaseInvoiceSchema,
  purchaseInvoiceUpdateSchema,
  roleSchema,
  stokSchema,
  supplierSchema,
  userCreateSchema,
  userRoleSchema,
  workerAdvanceSchema,
  workerSchema,
  workerTimeEntrySchema,
} from "@/lib/validators";

function revalidateEveryLocale(path: string) {
  measureSync("cache.revalidatePath", () => revalidatePath(`/sq${path}`), {
    path: `/sq${path}`,
  });
  measureSync("cache.revalidatePath", () => revalidatePath(`/en${path}`), {
    path: `/en${path}`,
  });
}

function revalidateSupplierPaths() {
  revalidateEveryLocale("/admin/suppliers");
  revalidateEveryLocale("/admin/purchase-invoices");
}

function revalidateDeliveryNotePaths() {
  revalidateEveryLocale("/admin/delivery-notes");
  revalidateEveryLocale("/admin/reports");
}

function revalidateExpensePaths() {
  revalidateEveryLocale("/admin/expenses");
  revalidateEveryLocale("/admin/reports");
}

function revalidateDebitNotePaths() {
  revalidateEveryLocale("/admin/debit-notes");
  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/clients");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

function revalidateQuoteRequestPaths() {
  revalidateEveryLocale("/admin/leads");
  revalidateEveryLocale("/admin");
}

async function deleteNotificationActionImpl(
  locale: Locale,
  notificationId: string,
) {
  await ensureAllowed(locale, "DASHBOARD", "DELETE");

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  revalidateEveryLocale("/admin");
}

function parseCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

const STANDARD_VAT_RATE = 18;

async function assertActiveClient(clientId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!client) {
    throw new Error("Selected client could not be found.");
  }
}

async function assertActiveSupplier(supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!supplier) {
    throw new Error("Selected supplier could not be found.");
  }
}

function amountPaidForStatus(
  status: InvoiceStatus,
  totalCents: number,
  requestedAmount?: number,
  fallbackAmountCents = 0,
) {
  if (status === InvoiceStatus.PAID) {
    return totalCents;
  }

  if (status === InvoiceStatus.UNPAID || status === InvoiceStatus.OVERDUE) {
    return 0;
  }

  const requestedAmountCents =
    requestedAmount == null
      ? fallbackAmountCents
      : parseMoneyToCents(requestedAmount);

  return Math.min(Math.max(requestedAmountCents, 0), totalCents);
}

function parseDocumentDate(value: string) {
  const trimmed = value.trim();
  const europeanDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);

  if (europeanDate) {
    const [, day, month, year] = europeanDate;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

    if (
      parsedDate.getFullYear() === Number(year) &&
      parsedDate.getMonth() === Number(month) - 1 &&
      parsedDate.getDate() === Number(day)
    ) {
      return parsedDate;
    }
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? new Date(`${trimmed}T00:00:00`) : null;

  if (isoDate && !Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  throw new Error("Date must be in DD/MM/YYYY format.");
}

async function ensureAllowed(
  locale: Locale,
  module: Parameters<typeof assertPermission>[1],
  action: Parameters<typeof assertPermission>[2],
) {
  const user = await assertPermission(locale, module, action);
  return user as {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    roleId: string | null;
    roleRecord: {
      id: string;
      key: string | null;
      name: string;
      isOwner: boolean;
      isSystem: boolean;
    } | null;
    lastLoginAt: Date | null;
  };
}

async function getRoleForAssignment(roleId: string) {
  await ensureSystemRoles();
  const role = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    throw new Error("Role not found.");
  }

  return role;
}

function fallbackUserRole(role: { key: string | null; isOwner: boolean }): UserRole {
  if (role.isOwner || role.key === "OWNER") {
    return "OWNER";
  }

  if (role.key === "MANAGER") {
    return "MANAGER";
  }

  return "STAFF";
}

function userPermissionRows(userId: string, matrix: PermissionMatrix) {
  return permissionModules.flatMap((module) =>
    permissionActions.map((action) => ({
      userId,
      module,
      action,
      allowed: matrix[module][action],
    })),
  );
}

function permissionMatrixFromFormData(formData: FormData) {
  return Object.fromEntries(
    permissionModules.map((module) => [
      module,
      Object.fromEntries(
        permissionActions.map((action) => [
          action,
          formData.get(`${module}:${action}`) === "on",
        ]),
      ),
    ]),
  ) as PermissionMatrix;
}

function userPermissionOperations(userId: string, formData: FormData) {
  return permissionModules.flatMap((module) =>
    permissionActions.map((action) =>
      prisma.userPermission.upsert({
        where: {
          userId_module_action: {
            userId,
            module,
            action,
          },
        },
        update: {
          allowed: formData.get(`${module}:${action}`) === "on",
        },
        create: {
          userId,
          module,
          action,
          allowed: formData.get(`${module}:${action}`) === "on",
        },
      }),
    ),
  );
}

async function createClientActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "CLIENTS", "CREATE");

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    nui: formData.get("nui"),
    vatNumber: formData.get("vatNumber"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid client payload.");
  }

  await prisma.client.create({
    data: parsed.data,
  });

  revalidateEveryLocale("/admin/clients");
}

async function updateClientActionImpl(
  locale: Locale,
  clientId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "CLIENTS", "EDIT");

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    nui: formData.get("nui"),
    vatNumber: formData.get("vatNumber"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid client payload.");
  }

  await prisma.client.update({
    where: { id: clientId },
    data: parsed.data,
  });

  revalidateEveryLocale("/admin/clients");
}

async function deleteClientActionImpl(locale: Locale, clientId: string) {
  await ensureAllowed(locale, "CLIENTS", "DELETE");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      offers: { select: { id: true }, take: 1 },
      invoices: { select: { id: true }, take: 1 },
    },
  });

  if (!client) {
    revalidateEveryLocale("/admin/clients");
    return;
  }

  if (client.offers.length > 0 || client.invoices.length > 0) {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        deletedAt: new Date(),
      },
    });
  } else {
    await prisma.client.delete({
      where: { id: clientId },
    });
  }

  revalidateEveryLocale("/admin/clients");
}

async function createSupplierActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "SUPPLIERS", "CREATE");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    nui: formData.get("nui"),
    vatNumber: formData.get("vatNumber"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier payload.");
  }

  await prisma.supplier.create({
    data: parsed.data,
  });

  revalidateSupplierPaths();
}

async function updateSupplierActionImpl(
  locale: Locale,
  supplierId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "SUPPLIERS", "EDIT");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    nui: formData.get("nui"),
    vatNumber: formData.get("vatNumber"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier payload.");
  }

  await prisma.supplier.update({
    where: { id: supplierId },
    data: parsed.data,
  });

  revalidateSupplierPaths();
}

async function deleteSupplierActionImpl(locale: Locale, supplierId: string) {
  await ensureAllowed(locale, "SUPPLIERS", "DELETE");

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      purchaseInvoices: { select: { id: true }, take: 1 },
    },
  });

  if (!supplier) {
    revalidateSupplierPaths();
    return;
  }

  if (supplier.purchaseInvoices.length > 0) {
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        deletedAt: new Date(),
      },
    });
  } else {
    await prisma.supplier.delete({
      where: { id: supplierId },
    });
  }

  revalidateSupplierPaths();
}

async function convertLeadToClientActionImpl(locale: Locale, leadId: string) {
  await ensureAllowed(locale, "LEADS", "EDIT");
  await ensureAllowed(locale, "CLIENTS", "CREATE");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new Error("Lead not found.");
  }

  if (lead.clientId) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.CONVERTED },
    });
    revalidateEveryLocale("/admin/leads");
    revalidateEveryLocale("/admin/clients");
    return;
  }

  const client = await prisma.client.create({
    data: {
      name: lead.name,
      contactPerson: lead.name,
      email: lead.email,
      phone: lead.phone,
      notes: lead.description,
    },
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      clientId: client.id,
      status: LeadStatus.CONVERTED,
    },
  });

  revalidateEveryLocale("/admin/leads");
  revalidateEveryLocale("/admin/clients");
}

async function updateLeadStatusActionImpl(
  locale: Locale,
  leadId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "LEADS", "EDIT");
  const parsed = leadStatusSchema.safeParse({
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error("Invalid lead status.");
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: parsed.data.status,
    },
  });

  revalidateEveryLocale("/admin/leads");
}

async function deleteLeadActionImpl(locale: Locale, leadId: string) {
  await ensureAllowed(locale, "LEADS", "DELETE");

  await prisma.lead.delete({
    where: { id: leadId },
  });

  revalidateEveryLocale("/admin/leads");
}

async function updateQuoteRequestStatusActionImpl(
  locale: Locale,
  quoteRequestId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "LEADS", "EDIT");
  const parsed = quoteRequestStatusSchema.safeParse({
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error("Invalid quote request status.");
  }

  await prisma.quoteRequest.update({
    where: { id: quoteRequestId },
    data: {
      status: parsed.data.status,
    },
  });

  revalidateQuoteRequestPaths();
}

async function deleteQuoteRequestActionImpl(
  locale: Locale,
  quoteRequestId: string,
) {
  await ensureAllowed(locale, "LEADS", "DELETE");

  await prisma.quoteRequest.delete({
    where: { id: quoteRequestId },
  });

  revalidateQuoteRequestPaths();
}

async function createMaterialActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "INVENTORY", "CREATE");

  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    type: formData.get("type"),
    unit: formData.get("unit"),
    stockQuantity: formData.get("stockQuantity"),
    lowStockThreshold: formData.get("lowStockThreshold"),
    costPerUnit: formData.get("costPerUnit"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid material data.");
  }

  const { costPerUnit, ...materialData } = parsed.data;

  await prisma.material.create({
    data: {
      ...materialData,
      costPerUnitCents: parseMoneyToCents(costPerUnit),
    },
  });

  revalidateEveryLocale("/admin/inventory");
}

async function updateMaterialActionImpl(
  locale: Locale,
  materialId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "INVENTORY", "EDIT");

  const parsed = materialSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    type: formData.get("type"),
    unit: formData.get("unit"),
    stockQuantity: formData.get("stockQuantity"),
    lowStockThreshold: formData.get("lowStockThreshold"),
    costPerUnit: formData.get("costPerUnit"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid material data.");
  }

  await prisma.material.update({
    where: { id: materialId },
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku,
      type: parsed.data.type,
      unit: parsed.data.unit,
      stockQuantity: parsed.data.stockQuantity,
      lowStockThreshold: parsed.data.lowStockThreshold,
      costPerUnitCents: parseMoneyToCents(parsed.data.costPerUnit),
      notes: parsed.data.notes,
    },
  });

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/inventory");
}

async function deleteMaterialActionImpl(locale: Locale, materialId: string) {
  await ensureAllowed(locale, "INVENTORY", "DELETE");

  await prisma.material.delete({
    where: { id: materialId },
  });

  revalidateEveryLocale("/admin/inventory");
}

async function adjustInventoryActionImpl(
  locale: Locale,
  materialId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "INVENTORY", "EDIT");

  const parsed = inventoryAdjustmentSchema.safeParse({
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    throw new Error("Invalid inventory adjustment.");
  }

  await prisma.material.update({
    where: { id: materialId },
    data: {
      stockQuantity: {
        increment: parsed.data.quantity,
      },
      movements: {
        create: {
          kind: InventoryMovementKind.RESTOCK,
          quantity: parsed.data.quantity,
          note: parsed.data.note ?? "Manual stock adjustment",
        },
      },
    },
  });

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/inventory");
}

async function createAssetInventoryActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "ASSETS_INVENTORY", "CREATE");

  const parsed = assetInventorySchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    value: formData.get("value"),
    purchaseDate: formData.get("purchaseDate"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid asset payload.");
  }

  await prisma.assetInventory.create({
    data: {
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      valueCents: parseMoneyToCents(parsed.data.value),
      purchaseDate: parseDocumentDate(parsed.data.purchaseDate),
    },
  });

  revalidateEveryLocale("/admin/assets-inventory");
}

async function updateAssetInventoryActionImpl(
  locale: Locale,
  assetId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "ASSETS_INVENTORY", "EDIT");

  const parsed = assetInventorySchema.safeParse({
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    value: formData.get("value"),
    purchaseDate: formData.get("purchaseDate"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid asset payload.");
  }

  await prisma.assetInventory.update({
    where: { id: assetId },
    data: {
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      valueCents: parseMoneyToCents(parsed.data.value),
      purchaseDate: parseDocumentDate(parsed.data.purchaseDate),
    },
  });

  revalidateEveryLocale("/admin/assets-inventory");
}

async function deleteAssetInventoryActionImpl(locale: Locale, assetId: string) {
  await ensureAllowed(locale, "ASSETS_INVENTORY", "DELETE");

  await prisma.assetInventory.delete({
    where: { id: assetId },
  });

  revalidateEveryLocale("/admin/assets-inventory");
}

function parseStokItems(formData: FormData) {
  try {
    const items = JSON.parse(String(formData.get("itemsData") ?? "[]"));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function aggregateStokItems(items: Array<{ materialId: string; quantity: number }>) {
  const itemMap = new Map<string, number>();

  for (const item of items) {
    itemMap.set(item.materialId, (itemMap.get(item.materialId) ?? 0) + item.quantity);
  }

  return Array.from(itemMap, ([materialId, quantity]) => ({
    materialId,
    quantity,
  }));
}

async function assertStokMaterials(materialIds: string[]) {
  const materials = await prisma.material.findMany({
    where: {
      id: {
        in: materialIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (materials.length !== materialIds.length) {
    throw new Error("Selected inventory item could not be found.");
  }
}

async function createStokActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "STOQET", "CREATE");

  const parsed = stokSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    items: parseStokItems(formData),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid stock payload.");
  }

  const items = aggregateStokItems(parsed.data.items);
  await assertStokMaterials(items.map((item) => item.materialId));

  await prisma.stok.create({
    data: {
      name: parsed.data.name,
      priceCents: parseMoneyToCents(parsed.data.price),
      items: {
        create: items,
      },
    },
  });

  revalidateEveryLocale("/admin/stoqet");
}

async function updateStokActionImpl(
  locale: Locale,
  stokId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "STOQET", "EDIT");

  const parsed = stokSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    items: parseStokItems(formData),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid stock payload.");
  }

  const items = aggregateStokItems(parsed.data.items);
  await assertStokMaterials(items.map((item) => item.materialId));

  await prisma.$transaction([
    prisma.stokArtikull.deleteMany({
      where: { stokId },
    }),
    prisma.stok.update({
      where: { id: stokId },
      data: {
        name: parsed.data.name,
        priceCents: parseMoneyToCents(parsed.data.price),
        items: {
          create: items,
        },
      },
    }),
  ]);

  revalidateEveryLocale("/admin/stoqet");
}

async function deleteStokActionImpl(locale: Locale, stokId: string) {
  await ensureAllowed(locale, "STOQET", "DELETE");

  await prisma.stok.delete({
    where: { id: stokId },
  });

  revalidateEveryLocale("/admin/stoqet");
}

function parseWorkerDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid time entry.");
  }

  return parsed;
}

async function createWorkerActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "WORKER_HOURS", "CREATE");

  const parsed = workerSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid worker payload.");
  }

  await prisma.worker.create({
    data: parsed.data,
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function updateWorkerActionImpl(
  locale: Locale,
  workerId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "WORKER_HOURS", "EDIT");

  const parsed = workerSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid worker payload.");
  }

  await prisma.worker.update({
    where: { id: workerId },
    data: parsed.data,
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function deleteWorkerActionImpl(locale: Locale, workerId: string) {
  await ensureAllowed(locale, "WORKER_HOURS", "DELETE");

  await prisma.worker.delete({
    where: { id: workerId },
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function createWorkerTimeEntryActionImpl(
  locale: Locale,
  workerId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "WORKER_HOURS", "CREATE");

  const parsed = workerTimeEntrySchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    finishTime: formData.get("finishTime"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid worker time entry.");
  }

  const startedAt = parseWorkerDateTime(parsed.data.date, parsed.data.startTime);
  const finishedAt = parseWorkerDateTime(parsed.data.date, parsed.data.finishTime);

  if (finishedAt <= startedAt) {
    throw new Error("Finish time must be after start time.");
  }

  await prisma.workerTimeEntry.create({
    data: {
      workerId,
      startedAt,
      finishedAt,
    },
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function updateWorkerTimeEntryActionImpl(
  locale: Locale,
  entryId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "WORKER_HOURS", "EDIT");

  const parsed = workerTimeEntrySchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    finishTime: formData.get("finishTime"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid worker time entry.");
  }

  const startedAt = parseWorkerDateTime(parsed.data.date, parsed.data.startTime);
  const finishedAt = parseWorkerDateTime(parsed.data.date, parsed.data.finishTime);

  if (finishedAt <= startedAt) {
    throw new Error("Finish time must be after start time.");
  }

  const advanceAmountValue = String(formData.get("advanceAmount") ?? "").trim();
  const advanceIds = String(formData.get("advanceIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const primaryAdvanceId = advanceIds[0];
  const extraAdvanceIds = advanceIds.slice(1);
  const entry = await prisma.workerTimeEntry.findUnique({
    where: { id: entryId },
    select: { workerId: true },
  });

  if (!entry) {
    throw new Error("Selected time entry could not be found.");
  }

  const advanceAmount =
    advanceAmountValue.length > 0 ? Number(advanceAmountValue.replace(",", ".")) : null;

  if (advanceAmount !== null && (!Number.isFinite(advanceAmount) || advanceAmount <= 0)) {
    throw new Error("Invalid worker advance.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.workerTimeEntry.update({
      where: { id: entryId },
      data: {
        startedAt,
        finishedAt,
      },
    });

    if (extraAdvanceIds.length > 0) {
      await tx.workerAdvance.deleteMany({
        where: {
          id: { in: extraAdvanceIds },
          workerId: entry.workerId,
        },
      });
    }

    if (advanceAmount === null) {
      if (advanceIds.length > 0) {
        await tx.workerAdvance.deleteMany({
          where: {
            id: { in: advanceIds },
            workerId: entry.workerId,
          },
        });
      }
      return;
    }

    const amountCents = parseMoneyToCents(advanceAmount);

    if (primaryAdvanceId) {
      await tx.workerAdvance.updateMany({
        where: {
          id: primaryAdvanceId,
          workerId: entry.workerId,
        },
        data: {
          date: parseDocumentDate(parsed.data.date),
          amountCents,
        },
      });
      return;
    }

    await tx.workerAdvance.create({
      data: {
        workerId: entry.workerId,
        date: parseDocumentDate(parsed.data.date),
        amountCents,
      },
    });
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function deleteWorkerTimeEntryActionImpl(locale: Locale, entryId: string) {
  await ensureAllowed(locale, "WORKER_HOURS", "DELETE");

  await prisma.workerTimeEntry.delete({
    where: { id: entryId },
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function createWorkerAdvanceActionImpl(
  locale: Locale,
  workerId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "WORKER_HOURS", "CREATE");

  const parsed = workerAdvanceSchema.safeParse({
    date: formData.get("advanceDate"),
    amount: formData.get("advanceAmount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid worker advance.");
  }

  await prisma.workerAdvance.create({
    data: {
      workerId,
      date: parseDocumentDate(parsed.data.date),
      amountCents: parseMoneyToCents(parsed.data.amount),
    },
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function updateWorkerAdvanceActionImpl(
  locale: Locale,
  advanceId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "WORKER_HOURS", "EDIT");

  const parsed = workerAdvanceSchema.safeParse({
    date: formData.get("advanceDate"),
    amount: formData.get("advanceAmount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid worker advance.");
  }

  await prisma.workerAdvance.update({
    where: { id: advanceId },
    data: {
      date: parseDocumentDate(parsed.data.date),
      amountCents: parseMoneyToCents(parsed.data.amount),
    },
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function deleteWorkerAdvanceActionImpl(locale: Locale, advanceId: string) {
  await ensureAllowed(locale, "WORKER_HOURS", "DELETE");

  await prisma.workerAdvance.delete({
    where: { id: advanceId },
  });

  revalidateEveryLocale("/admin/worker-hours");
}

async function createProductActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "INVENTORY", "CREATE");

  const bom = JSON.parse(String(formData.get("bomData") ?? "[]")) as Array<{
    materialId: string;
    quantity: number;
  }>;

  const parsed = productSchema.safeParse({
    nameSq: formData.get("nameSq"),
    nameEn: formData.get("nameEn"),
    slug: formData.get("slug"),
    category: formData.get("category"),
    summarySq: formData.get("summarySq"),
    summaryEn: formData.get("summaryEn"),
    descriptionSq: formData.get("descriptionSq"),
    descriptionEn: formData.get("descriptionEn"),
    dimensions: formData.get("dimensions"),
    materialNotesSq: formData.get("materialNotesSq"),
    materialNotesEn: formData.get("materialNotesEn"),
    featured: parseCheckbox(formData, "featured"),
    basePrice: formData.get("basePrice"),
    laborCost: formData.get("laborCost"),
    bom: bom.map((item) =>
      productBomItemSchema.parse({
        materialId: item.materialId,
        quantity: item.quantity,
      }),
    ),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid product payload.");
  }

  const slug = parsed.data.slug ?? slugify(parsed.data.nameEn);

  await prisma.product.create({
    data: {
      slug,
      nameSq: parsed.data.nameSq,
      nameEn: parsed.data.nameEn,
      category: parsed.data.category,
      summarySq: parsed.data.summarySq,
      summaryEn: parsed.data.summaryEn,
      descriptionSq: parsed.data.descriptionSq,
      descriptionEn: parsed.data.descriptionEn,
      dimensions: parsed.data.dimensions,
      materialNotesSq: parsed.data.materialNotesSq,
      materialNotesEn: parsed.data.materialNotesEn,
      featured: parsed.data.featured,
      basePriceCents: parseMoneyToCents(parsed.data.basePrice),
      laborCostCents: parseMoneyToCents(parsed.data.laborCost),
      bomItems: {
        create: parsed.data.bom,
      },
    },
  });

  revalidateEveryLocale("/admin/products");
  revalidateEveryLocale("/furniture");
  revalidateEveryLocale("/");
}

async function createOfferActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "OFFERS", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    materialId: string;
    quantity: number;
    unitPrice?: number;
  }>;
  const rawClientId = formData.get("clientId");
  if (typeof rawClientId === "string" && rawClientId.length > 0) {
    await assertActiveClient(rawClientId);
  }

  const parsed = offerSchema.safeParse({
    number: formData.get("number"),
    clientId: rawClientId,
    leadId: formData.get("leadId") ?? "",
    status: formData.get("status"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: STANDARD_VAT_RATE,
    items: itemsData.map((item) => offerItemSchema.parse(item)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid offer payload.");
  }

  const materials = await prisma.material.findMany({
    where: {
      id: {
        in: parsed.data.items.map((item) => item.materialId),
      },
    },
  });

  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const lineItems = parsed.data.items.map((item) => {
    const material = materialMap.get(item.materialId);
    if (!material) {
      throw new Error("Selected inventory item could not be found.");
    }

    const unitPriceCents = parseMoneyToCents(item.unitPrice);

    return {
      materialId: material.id,
      productName: material.name,
      description: material.sku,
      quantity: item.quantity,
      unitPriceCents,
      unitCostCents: material.costPerUnitCents,
      lineTotalCents: unitPriceCents * item.quantity,
    };
  });

  const totals = calculateTotals(
    lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  await prisma.offer.create({
    data: {
      number: parsed.data.number,
      clientId: parsed.data.clientId,
      leadId: parsed.data.leadId,
      status: parsed.data.status,
      validUntil: parseDocumentDate(parsed.data.validUntil),
      notes: parsed.data.notes,
      ...totals,
      items: {
        create: lineItems,
      },
    },
  });

  revalidateEveryLocale("/admin/offers");
  revalidateEveryLocale("/admin");
}

async function updateOfferStatusActionImpl(
  locale: Locale,
  offerId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "OFFERS", "EDIT");

  const status = String(formData.get("status") ?? "");
  if (!Object.values(OfferStatus).includes(status as OfferStatus)) {
    throw new Error("Invalid offer status.");
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      client: true,
      items: true,
    },
  });

  if (!offer) {
    throw new Error("Offer not found.");
  }

  const subtotalCents = offer.items.reduce(
    (sum, item) => sum + item.lineTotalCents,
    0,
  );
  const totals = calculateTotals(
    subtotalCents,
    parseCheckbox(formData, "vatEnabled"),
    STANDARD_VAT_RATE,
  );
  const validUntil = String(formData.get("validUntil") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.offer.update({
    where: { id: offerId },
    data: {
      status: status as OfferStatus,
      validUntil: validUntil ? parseDocumentDate(validUntil) : offer.validUntil,
      notes: notes.length > 0 ? notes : null,
      ...totals,
    },
  });

  revalidateEveryLocale("/admin/offers");
}

async function deleteOfferActionImpl(locale: Locale, offerId: string) {
  await ensureAllowed(locale, "OFFERS", "DELETE");

  await prisma.offer.delete({
    where: { id: offerId },
  });

  revalidateEveryLocale("/admin/offers");
}

async function deductInventoryForInvoice(
  invoiceId: string,
  items: Array<{ productId: string | null; materialId: string | null; quantity: number }>,
) {
  const directMaterialItems = items.filter((item) => item.materialId);
  const productIds = items
    .map((item) => item.productId)
    .filter((value): value is string => Boolean(value));

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    include: {
      bomItems: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const item of directMaterialItems) {
    if (!item.materialId) {
      continue;
    }

    operations.push(
      prisma.material.update({
        where: { id: item.materialId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      }),
    );
    operations.push(
      prisma.inventoryMovement.create({
        data: {
          invoiceId,
          materialId: item.materialId,
          kind: InventoryMovementKind.CONSUMPTION,
          quantity: item.quantity,
          note: `Auto-deducted from sales invoice ${invoiceId}`,
        },
      }),
    );
  }

  for (const item of items) {
    if (!item.productId) {
      continue;
    }

    const product = productMap.get(item.productId);
    if (!product) {
      continue;
    }

    for (const bomItem of product.bomItems) {
      const consumption = bomItem.quantity * item.quantity;
      operations.push(
        prisma.material.update({
          where: { id: bomItem.materialId },
          data: {
            stockQuantity: {
              decrement: consumption,
            },
          },
        }),
      );
      operations.push(
        prisma.inventoryMovement.create({
          data: {
            invoiceId,
            materialId: bomItem.materialId,
            kind: InventoryMovementKind.CONSUMPTION,
            quantity: consumption,
            note: `Auto-deducted from invoice ${invoiceId}`,
          },
        }),
      );
    }
  }

  operations.push(
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        inventoryDeductedAt: new Date(),
      },
    }),
  );

  await prisma.$transaction(operations);
}

async function createInvoiceActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "INVOICES", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    materialId: string;
    quantity: number;
    unitPrice: number;
  }>;
  const rawClientId = formData.get("clientId");
  if (typeof rawClientId === "string" && rawClientId.length > 0) {
    await assertActiveClient(rawClientId);
  }

  const parsed = invoiceSchema.safeParse({
    number: formData.get("number"),
    clientId: rawClientId,
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: STANDARD_VAT_RATE,
    amountPaid: undefined,
    items: itemsData.map((item) =>
      offerItemSchema.parse({
        ...item,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice && item.unitPrice > 0 ? item.unitPrice : 1,
      }),
    ),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice payload.");
  }

  const materials = await prisma.material.findMany({
    where: {
      id: {
        in: parsed.data.items.map((item) => item.materialId),
      },
    },
  });

  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const lineItems = parsed.data.items.map((item) => {
    const material = materialMap.get(item.materialId);
    if (!material) {
      throw new Error("Selected inventory item could not be found.");
    }

    const unitPriceCents = material.costPerUnitCents;

    return {
      materialId: material.id,
      productName: material.name,
      description: material.sku,
      quantity: item.quantity,
      unitPriceCents,
      unitCostCents: material.costPerUnitCents,
      lineTotalCents: unitPriceCents * item.quantity,
    };
  });

  const totals = calculateTotals(
    lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  const invoice = await prisma.invoice.create({
    data: {
      number: parsed.data.number,
      clientId: parsed.data.clientId,
      status: parsed.data.status,
      dueDate: parseDocumentDate(parsed.data.dueDate),
      notes: parsed.data.notes,
      amountPaidCents: amountPaidForStatus(
        parsed.data.status,
        totals.totalCents,
        parsed.data.amountPaid,
      ),
      paidAt: parsed.data.status === InvoiceStatus.PAID ? new Date() : null,
      ...totals,
      items: {
        create: lineItems,
      },
    },
    include: {
      items: true,
    },
  });

  await deductInventoryForInvoice(
    invoice.id,
    invoice.items.map((item) => ({
      productId: item.productId,
      materialId: item.materialId,
      quantity: item.quantity,
    })),
  );

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/inventory");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

async function convertOfferToInvoiceActionImpl(locale: Locale, offerId: string) {
  await ensureAllowed(locale, "OFFERS", "EDIT");
  await ensureAllowed(locale, "INVOICES", "CREATE");

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      items: true,
      invoice: true,
    },
  });

  if (!offer) {
    throw new Error("Offer not found.");
  }

  if (offer.invoice) {
    revalidateEveryLocale("/admin/invoices");
    return;
  }

  const invoiceCount = await prisma.invoice.count();
  const invoice = await prisma.invoice.create({
    data: {
      number: `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, "0")}`,
      clientId: offer.clientId,
      offerId: offer.id,
      status: offer.status === OfferStatus.ACCEPTED ? InvoiceStatus.UNPAID : InvoiceStatus.UNPAID,
      notes: offer.notes,
      dueDate: addDays(new Date(), 15),
      ...calculateTotals(offer.subtotalCents, offer.vatEnabled, offer.vatRate),
      items: {
        create: offer.items.map((item) => ({
          productId: item.productId,
          materialId: item.materialId,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          unitCostCents: item.unitCostCents,
          lineTotalCents: item.lineTotalCents,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  await deductInventoryForInvoice(
    invoice.id,
    invoice.items.map((item) => ({
      productId: item.productId,
      materialId: item.materialId,
      quantity: item.quantity,
    })),
  );

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/offers");
  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/inventory");
  revalidateEveryLocale("/admin");
}

async function updateInvoiceActionImpl(
  locale: Locale,
  invoiceId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "INVOICES", "EDIT");

  const parsed = invoiceUpdateSchema.safeParse({
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: STANDARD_VAT_RATE,
    amountPaid: formData.get("amountPaid"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice payload.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      items: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const subtotalCents = invoice.items.reduce(
    (sum, item) => sum + item.lineTotalCents,
    0,
  );
  const totals = calculateTotals(
    subtotalCents,
    parsed.data.vatEnabled,
    STANDARD_VAT_RATE,
  );

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: parsed.data.status,
      dueDate: parseDocumentDate(parsed.data.dueDate),
      notes: parsed.data.notes,
      ...totals,
      amountPaidCents: amountPaidForStatus(
        parsed.data.status,
        totals.totalCents,
        parsed.data.amountPaid,
        invoice.amountPaidCents,
      ),
      paidAt: parsed.data.status === InvoiceStatus.PAID ? new Date() : null,
    },
  });

  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

async function deleteInvoiceActionImpl(locale: Locale, invoiceId: string) {
  await ensureAllowed(locale, "INVOICES", "DELETE");

  await prisma.invoice.delete({
    where: { id: invoiceId },
  });

  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

async function restockInventoryForPurchaseInvoice(
  purchaseInvoiceId: string,
  items: Array<{ materialId: string | null; quantity: number }>,
) {
  const operations: Prisma.PrismaPromise<unknown>[] = [];

  for (const item of items) {
    if (!item.materialId) {
      continue;
    }

    operations.push(
      prisma.material.update({
        where: { id: item.materialId },
        data: {
          stockQuantity: {
            increment: item.quantity,
          },
        },
      }),
    );
    operations.push(
      prisma.inventoryMovement.create({
        data: {
          purchaseInvoiceId,
          materialId: item.materialId,
          kind: InventoryMovementKind.RESTOCK,
          quantity: item.quantity,
          note: `Auto-restocked from purchase invoice ${purchaseInvoiceId}`,
        },
      }),
    );
  }

  operations.push(
    prisma.purchaseInvoice.update({
      where: { id: purchaseInvoiceId },
      data: {
        inventoryRestockedAt: new Date(),
      },
    }),
  );

  await prisma.$transaction(operations);
}

async function createPurchaseInvoiceActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "PURCHASE_INVOICES", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    materialId: string;
    quantity: number;
    unitPrice: number;
  }>;
  const rawSupplierId = formData.get("supplierId");
  if (typeof rawSupplierId === "string" && rawSupplierId.length > 0) {
    await assertActiveSupplier(rawSupplierId);
  }

  const parsed = purchaseInvoiceSchema.safeParse({
    number: formData.get("number"),
    supplierId: rawSupplierId,
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: STANDARD_VAT_RATE,
    amountPaid: formData.get("amountPaid"),
    items: itemsData.map((item) => offerItemSchema.parse(item)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid purchase invoice payload.");
  }

  const materials = await prisma.material.findMany({
    where: {
      id: {
        in: parsed.data.items.map((item) => item.materialId),
      },
    },
  });

  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const lineItems = parsed.data.items.map((item) => {
    const material = materialMap.get(item.materialId);
    if (!material) {
      throw new Error("Selected inventory item could not be found.");
    }

    const unitPriceCents = parseMoneyToCents(item.unitPrice);

    return {
      materialId: material.id,
      productName: material.name,
      description: material.sku,
      quantity: item.quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * item.quantity,
    };
  });

  const totals = calculateTotals(
    lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  const purchaseInvoice = await prisma.purchaseInvoice.create({
    data: {
      number: parsed.data.number,
      supplierId: parsed.data.supplierId,
      status: parsed.data.status,
      dueDate: parseDocumentDate(parsed.data.dueDate),
      notes: parsed.data.notes,
      amountPaidCents: amountPaidForStatus(
        parsed.data.status,
        totals.totalCents,
        parsed.data.amountPaid,
      ),
      paidAt: parsed.data.status === InvoiceStatus.PAID ? new Date() : null,
      ...totals,
      items: {
        create: lineItems,
      },
    },
    include: {
      items: true,
    },
  });

  await restockInventoryForPurchaseInvoice(
    purchaseInvoice.id,
    purchaseInvoice.items.map((item) => ({
      materialId: item.materialId,
      quantity: item.quantity,
    })),
  );

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/purchase-invoices");
  revalidateEveryLocale("/admin/inventory");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

async function updatePurchaseInvoiceActionImpl(
  locale: Locale,
  purchaseInvoiceId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "PURCHASE_INVOICES", "EDIT");

  const parsed = purchaseInvoiceUpdateSchema.safeParse({
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: STANDARD_VAT_RATE,
    amountPaid: formData.get("amountPaid"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid purchase invoice payload.");
  }

  const purchaseInvoice = await prisma.purchaseInvoice.findUnique({
    where: { id: purchaseInvoiceId },
    include: {
      supplier: true,
      items: true,
    },
  });

  if (!purchaseInvoice) {
    throw new Error("Purchase invoice not found.");
  }

  const subtotalCents = purchaseInvoice.items.reduce(
    (sum, item) => sum + item.lineTotalCents,
    0,
  );
  const totals = calculateTotals(
    subtotalCents,
    parsed.data.vatEnabled,
    STANDARD_VAT_RATE,
  );

  await prisma.purchaseInvoice.update({
    where: { id: purchaseInvoiceId },
    data: {
      status: parsed.data.status,
      dueDate: parseDocumentDate(parsed.data.dueDate),
      notes: parsed.data.notes,
      ...totals,
      amountPaidCents: amountPaidForStatus(
        parsed.data.status,
        totals.totalCents,
        parsed.data.amountPaid,
        purchaseInvoice.amountPaidCents,
      ),
      paidAt: parsed.data.status === InvoiceStatus.PAID ? new Date() : null,
    },
  });

  revalidateEveryLocale("/admin/purchase-invoices");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

async function deletePurchaseInvoiceActionImpl(
  locale: Locale,
  purchaseInvoiceId: string,
) {
  await ensureAllowed(locale, "PURCHASE_INVOICES", "DELETE");

  await prisma.purchaseInvoice.delete({
    where: { id: purchaseInvoiceId },
  });

  revalidateEveryLocale("/admin/purchase-invoices");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

async function createDeliveryNoteActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "DELIVERY_NOTES", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    materialId: string;
    quantity: number;
  }>;
  const type = formData.get("type");
  const rawClientId = formData.get("clientId");
  const rawSupplierId = formData.get("supplierId");

  if (type === DeliveryNoteType.SALES && typeof rawClientId === "string" && rawClientId) {
    await assertActiveClient(rawClientId);
  }

  if (
    type === DeliveryNoteType.PURCHASE &&
    typeof rawSupplierId === "string" &&
    rawSupplierId
  ) {
    await assertActiveSupplier(rawSupplierId);
  }

  const parsed = deliveryNoteSchema.safeParse({
    type,
    number: formData.get("number"),
    clientId: rawClientId ?? "",
    supplierId: rawSupplierId ?? "",
    status: formData.get("status"),
    issuedAt: formData.get("issuedAt"),
    notes: formData.get("notes"),
    items: itemsData.map((item) => deliveryNoteItemSchema.parse(item)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid delivery note payload.");
  }

  const materials = await prisma.material.findMany({
    where: {
      id: {
        in: parsed.data.items.map((item) => item.materialId),
      },
    },
  });
  const materialMap = new Map(materials.map((material) => [material.id, material]));

  const lineItems = parsed.data.items.map((item) => {
    const material = materialMap.get(item.materialId);
    if (!material) {
      throw new Error("Selected inventory item could not be found.");
    }

    return {
      materialId: material.id,
      productName: material.name,
      description: material.sku,
      quantity: item.quantity,
    };
  });

  await prisma.deliveryNote.create({
    data: {
      number: parsed.data.number,
      type: parsed.data.type,
      status: parsed.data.status,
      issuedAt: parseDocumentDate(parsed.data.issuedAt),
      notes: parsed.data.notes,
      clientId: parsed.data.type === DeliveryNoteType.SALES ? parsed.data.clientId : null,
      supplierId:
        parsed.data.type === DeliveryNoteType.PURCHASE ? parsed.data.supplierId : null,
      items: {
        create: lineItems,
      },
    },
  });

  revalidateDeliveryNotePaths();
}

async function updateDeliveryNoteActionImpl(
  locale: Locale,
  deliveryNoteId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "DELIVERY_NOTES", "EDIT");

  const parsed = deliveryNoteUpdateSchema.safeParse({
    status: formData.get("status"),
    issuedAt: formData.get("issuedAt"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid delivery note payload.");
  }

  await prisma.deliveryNote.update({
    where: { id: deliveryNoteId },
    data: {
      status: parsed.data.status,
      issuedAt: parseDocumentDate(parsed.data.issuedAt),
      notes: parsed.data.notes,
    },
  });

  revalidateDeliveryNotePaths();
}

async function deleteDeliveryNoteActionImpl(
  locale: Locale,
  deliveryNoteId: string,
) {
  await ensureAllowed(locale, "DELIVERY_NOTES", "DELETE");

  await prisma.deliveryNote.delete({
    where: { id: deliveryNoteId },
  });

  revalidateDeliveryNotePaths();
}

async function createExpenseActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "EXPENSES", "CREATE");

  const parsed = expenseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: formData.get("vatRate") || STANDARD_VAT_RATE,
    date: formData.get("date"),
    supplierName: formData.get("supplierName"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid expense payload.");
  }

  const totals = calculateTotals(
    parseMoneyToCents(parsed.data.amount),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  await prisma.expense.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      amountCents: totals.subtotalCents,
      vatEnabled: totals.vatEnabled,
      vatRate: totals.vatRate,
      vatAmountCents: totals.vatAmountCents,
      totalCents: totals.totalCents,
      date: parseDocumentDate(parsed.data.date),
      supplierName: parsed.data.supplierName,
      description: parsed.data.description,
    },
  });

  revalidateExpensePaths();
}

async function updateExpenseActionImpl(
  locale: Locale,
  expenseId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "EXPENSES", "EDIT");

  const parsed = expenseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: formData.get("vatRate") || STANDARD_VAT_RATE,
    date: formData.get("date"),
    supplierName: formData.get("supplierName"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid expense payload.");
  }

  const totals = calculateTotals(
    parseMoneyToCents(parsed.data.amount),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      amountCents: totals.subtotalCents,
      vatEnabled: totals.vatEnabled,
      vatRate: totals.vatRate,
      vatAmountCents: totals.vatAmountCents,
      totalCents: totals.totalCents,
      date: parseDocumentDate(parsed.data.date),
      supplierName: parsed.data.supplierName,
      description: parsed.data.description,
    },
  });

  revalidateExpensePaths();
}

async function deleteExpenseActionImpl(locale: Locale, expenseId: string) {
  await ensureAllowed(locale, "EXPENSES", "DELETE");

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  revalidateExpensePaths();
}

async function createDebitNoteActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "DEBIT_NOTES", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    invoiceItemId: string;
    quantity: number;
    unitPrice: number;
  }>;
  const rawClientId = formData.get("clientId");
  if (typeof rawClientId === "string" && rawClientId.length > 0) {
    await assertActiveClient(rawClientId);
  }

  const parsed = debitNoteSchema.safeParse({
    number: formData.get("number"),
    clientId: rawClientId,
    invoiceId: formData.get("invoiceId"),
    issuedAt: formData.get("issuedAt"),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: formData.get("vatRate") || STANDARD_VAT_RATE,
    items: itemsData,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid debit note payload.");
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: parsed.data.invoiceId,
      clientId: parsed.data.clientId,
    },
    include: {
      items: true,
      debitNotes: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Related sales invoice could not be found.");
  }

  const invoiceItemMap = new Map(invoice.items.map((item) => [item.id, item]));
  const lineItems = parsed.data.items.map((item) => {
    const invoiceItem = invoiceItemMap.get(item.invoiceItemId);
    if (!invoiceItem) {
      throw new Error("Selected invoice item could not be found.");
    }

    const previouslyAdjustedQuantity = invoice.debitNotes.reduce(
      (sum, debitNote) =>
        sum +
        debitNote.items
          .filter((debitItem) => debitItem.invoiceItemId === invoiceItem.id)
          .reduce((inner, debitItem) => inner + debitItem.quantity, 0),
      0,
    );
    const remainingQuantity = invoiceItem.quantity - previouslyAdjustedQuantity;

    if (item.quantity > remainingQuantity) {
      throw new Error("Returned quantity cannot be higher than the remaining invoice quantity.");
    }

    const unitPriceCents = parseMoneyToCents(item.unitPrice);

    return {
      invoiceItemId: invoiceItem.id,
      productName: invoiceItem.productName,
      description: invoiceItem.description,
      quantity: item.quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * item.quantity,
    };
  });

  const totals = calculateTotals(
    lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  await prisma.debitNote.create({
    data: {
      number: parsed.data.number,
      clientId: parsed.data.clientId,
      invoiceId: invoice.id,
      issuedAt: parseDocumentDate(parsed.data.issuedAt),
      reason: parsed.data.reason,
      notes: parsed.data.notes,
      ...totals,
      items: {
        create: lineItems,
      },
    },
  });

  revalidateDebitNotePaths();
}

async function updateDebitNoteActionImpl(
  locale: Locale,
  debitNoteId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "DEBIT_NOTES", "EDIT");

  const parsed = debitNoteUpdateSchema.safeParse({
    issuedAt: formData.get("issuedAt"),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid debit note payload.");
  }

  await prisma.debitNote.update({
    where: { id: debitNoteId },
    data: {
      issuedAt: parseDocumentDate(parsed.data.issuedAt),
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    },
  });

  revalidateDebitNotePaths();
}

async function deleteDebitNoteActionImpl(locale: Locale, debitNoteId: string) {
  await ensureAllowed(locale, "DEBIT_NOTES", "DELETE");

  await prisma.debitNote.delete({
    where: { id: debitNoteId },
  });

  revalidateDebitNotePaths();
}

async function createUserActionImpl(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "USERS", "CREATE");
  const parsed = userCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user payload.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const permissions = permissionMatrixFromFormData(formData);
  await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "STAFF",
        roleId: null,
      },
    });

    await tx.userPermission.createMany({
      data: userPermissionRows(createdUser.id, permissions),
    });
  });

  revalidateEveryLocale("/admin/users");
}

async function updateUserRoleActionImpl(
  locale: Locale,
  userId: string,
  formData: FormData,
) {
  const actor = await ensureAllowed(locale, "USERS", "EDIT");
  const parsed = userRoleSchema.safeParse({
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid user role.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { roleRecord: true },
  });
  if (!target) {
    throw new Error("User not found.");
  }

  if (target.roleRecord?.isOwner || target.role === "OWNER") {
    throw new Error(unauthorizedMessage(locale));
  }

  const role = await getRoleForAssignment(parsed.data.roleId);
  if (role.isOwner && !isOwnerUser(actor)) {
    throw new Error(unauthorizedMessage(locale));
  }

  const rolePermissions = await getPermissionMatrixForRoleRecord(role);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        role: fallbackUserRole(role),
        roleId: role.id,
      },
    }),
    prisma.userPermission.deleteMany({
      where: { userId },
    }),
    prisma.userPermission.createMany({
      data: userPermissionRows(userId, rolePermissions),
    }),
  ]);

  revalidateEveryLocale("/admin/users");
}

async function deleteUserActionImpl(locale: Locale, userId: string) {
  const actor = await ensureAllowed(locale, "USERS", "DELETE");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { roleRecord: true },
  });

  if (!target) {
    throw new Error("User not found.");
  }

  const actorIsOwner =
    actor.role === "OWNER" ||
    Boolean(actor.roleRecord?.isOwner) ||
    actor.email.toLowerCase() === "artiibela0@gmail.com";
  const targetIsOwner =
    target.role === "OWNER" ||
    Boolean(target.roleRecord?.isOwner) ||
    target.email.toLowerCase() === "artiibela0@gmail.com";

  if (target.id === actor.id || (targetIsOwner && !actorIsOwner)) {
    throw new Error(unauthorizedMessage(locale));
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidateEveryLocale("/admin/users");
}

async function updateUserPermissionsActionImpl(
  locale: Locale,
  userId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "USERS", "EDIT");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { roleRecord: true },
  });

  if (!target) {
    throw new Error("User not found.");
  }

  if (
    target.roleRecord?.isOwner ||
    target.role === "OWNER" ||
    target.email.toLowerCase() === "artiibela0@gmail.com"
  ) {
    throw new Error(unauthorizedMessage(locale));
  }

  await prisma.$transaction(userPermissionOperations(userId, formData));

  revalidateEveryLocale("/admin/users");
}

function rolePermissionOperations(roleId: string, formData: FormData) {
  return permissionModules.flatMap((module) =>
    permissionActions.map((action) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_module_action: {
            roleId,
            module,
            action,
          },
        },
        update: {
          allowed: formData.get(`${module}:${action}`) === "on",
        },
        create: {
          roleId,
          module,
          action,
          allowed: formData.get(`${module}:${action}`) === "on",
        },
      }),
    ),
  );
}

async function createRoleActionImpl(locale: Locale, formData: FormData) {
  await assertOwner(locale);

  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid role payload.");
  }

  const role = await prisma.role.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isSystem: false,
      isOwner: false,
    },
  });

  await prisma.$transaction(rolePermissionOperations(role.id, formData));
  revalidateEveryLocale("/admin/roles");
  revalidateEveryLocale("/admin/users");
}

async function updateRoleActionImpl(
  locale: Locale,
  roleId: string,
  formData: FormData,
) {
  await assertOwner(locale);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.isOwner) {
    throw new Error(unauthorizedMessage(locale));
  }

  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid role payload.");
  }

  await prisma.$transaction([
    prisma.role.update({
      where: { id: roleId },
      data: {
        name: role.isSystem ? role.name : parsed.data.name,
        description: parsed.data.description,
      },
    }),
    ...rolePermissionOperations(roleId, formData),
  ]);

  revalidateEveryLocale("/admin/roles");
  revalidateEveryLocale("/admin/users");
}

async function deleteRoleActionImpl(locale: Locale, roleId: string) {
  await assertOwner(locale);

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { users: true },
  });

  if (!role || role.isOwner || role.isSystem || role.users.length > 0) {
    throw new Error(unauthorizedMessage(locale));
  }

  await prisma.role.delete({
    where: { id: roleId },
  });

  revalidateEveryLocale("/admin/roles");
  revalidateEveryLocale("/admin/users");
}

export const deleteNotificationAction = withActionPerf("deleteNotificationAction", deleteNotificationActionImpl);
export const createClientAction = withActionPerf("createClientAction", createClientActionImpl);
export const updateClientAction = withActionPerf("updateClientAction", updateClientActionImpl);
export const deleteClientAction = withActionPerf("deleteClientAction", deleteClientActionImpl);
export const createSupplierAction = withActionPerf("createSupplierAction", createSupplierActionImpl);
export const updateSupplierAction = withActionPerf("updateSupplierAction", updateSupplierActionImpl);
export const deleteSupplierAction = withActionPerf("deleteSupplierAction", deleteSupplierActionImpl);
export const convertLeadToClientAction = withActionPerf("convertLeadToClientAction", convertLeadToClientActionImpl);
export const updateLeadStatusAction = withActionPerf("updateLeadStatusAction", updateLeadStatusActionImpl);
export const deleteLeadAction = withActionPerf("deleteLeadAction", deleteLeadActionImpl);
export const updateQuoteRequestStatusAction = withActionPerf("updateQuoteRequestStatusAction", updateQuoteRequestStatusActionImpl);
export const deleteQuoteRequestAction = withActionPerf("deleteQuoteRequestAction", deleteQuoteRequestActionImpl);
export const createMaterialAction = withActionPerf("createMaterialAction", createMaterialActionImpl);
export const updateMaterialAction = withActionPerf("updateMaterialAction", updateMaterialActionImpl);
export const deleteMaterialAction = withActionPerf("deleteMaterialAction", deleteMaterialActionImpl);
export const adjustInventoryAction = withActionPerf("adjustInventoryAction", adjustInventoryActionImpl);
export const createAssetInventoryAction = withActionPerf("createAssetInventoryAction", createAssetInventoryActionImpl);
export const updateAssetInventoryAction = withActionPerf("updateAssetInventoryAction", updateAssetInventoryActionImpl);
export const deleteAssetInventoryAction = withActionPerf("deleteAssetInventoryAction", deleteAssetInventoryActionImpl);
export const createStokAction = withActionPerf("createStokAction", createStokActionImpl);
export const updateStokAction = withActionPerf("updateStokAction", updateStokActionImpl);
export const deleteStokAction = withActionPerf("deleteStokAction", deleteStokActionImpl);
export const createWorkerAction = withActionPerf("createWorkerAction", createWorkerActionImpl);
export const updateWorkerAction = withActionPerf("updateWorkerAction", updateWorkerActionImpl);
export const deleteWorkerAction = withActionPerf("deleteWorkerAction", deleteWorkerActionImpl);
export const createWorkerTimeEntryAction = withActionPerf("createWorkerTimeEntryAction", createWorkerTimeEntryActionImpl);
export const updateWorkerTimeEntryAction = withActionPerf("updateWorkerTimeEntryAction", updateWorkerTimeEntryActionImpl);
export const deleteWorkerTimeEntryAction = withActionPerf("deleteWorkerTimeEntryAction", deleteWorkerTimeEntryActionImpl);
export const createWorkerAdvanceAction = withActionPerf("createWorkerAdvanceAction", createWorkerAdvanceActionImpl);
export const updateWorkerAdvanceAction = withActionPerf("updateWorkerAdvanceAction", updateWorkerAdvanceActionImpl);
export const deleteWorkerAdvanceAction = withActionPerf("deleteWorkerAdvanceAction", deleteWorkerAdvanceActionImpl);
export const createProductAction = withActionPerf("createProductAction", createProductActionImpl);
export const createOfferAction = withActionPerf("createOfferAction", createOfferActionImpl);
export const updateOfferStatusAction = withActionPerf("updateOfferStatusAction", updateOfferStatusActionImpl);
export const deleteOfferAction = withActionPerf("deleteOfferAction", deleteOfferActionImpl);
export const createInvoiceAction = withActionPerf("createInvoiceAction", createInvoiceActionImpl);
export const convertOfferToInvoiceAction = withActionPerf("convertOfferToInvoiceAction", convertOfferToInvoiceActionImpl);
export const updateInvoiceAction = withActionPerf("updateInvoiceAction", updateInvoiceActionImpl);
export const deleteInvoiceAction = withActionPerf("deleteInvoiceAction", deleteInvoiceActionImpl);
export const createPurchaseInvoiceAction = withActionPerf("createPurchaseInvoiceAction", createPurchaseInvoiceActionImpl);
export const updatePurchaseInvoiceAction = withActionPerf("updatePurchaseInvoiceAction", updatePurchaseInvoiceActionImpl);
export const deletePurchaseInvoiceAction = withActionPerf("deletePurchaseInvoiceAction", deletePurchaseInvoiceActionImpl);
export const createDeliveryNoteAction = withActionPerf("createDeliveryNoteAction", createDeliveryNoteActionImpl);
export const updateDeliveryNoteAction = withActionPerf("updateDeliveryNoteAction", updateDeliveryNoteActionImpl);
export const deleteDeliveryNoteAction = withActionPerf("deleteDeliveryNoteAction", deleteDeliveryNoteActionImpl);
export const createExpenseAction = withActionPerf("createExpenseAction", createExpenseActionImpl);
export const updateExpenseAction = withActionPerf("updateExpenseAction", updateExpenseActionImpl);
export const deleteExpenseAction = withActionPerf("deleteExpenseAction", deleteExpenseActionImpl);
export const createDebitNoteAction = withActionPerf("createDebitNoteAction", createDebitNoteActionImpl);
export const updateDebitNoteAction = withActionPerf("updateDebitNoteAction", updateDebitNoteActionImpl);
export const deleteDebitNoteAction = withActionPerf("deleteDebitNoteAction", deleteDebitNoteActionImpl);
export const createUserAction = withActionPerf("createUserAction", createUserActionImpl);
export const updateUserRoleAction = withActionPerf("updateUserRoleAction", updateUserRoleActionImpl);
export const deleteUserAction = withActionPerf("deleteUserAction", deleteUserActionImpl);
export const updateUserPermissionsAction = withActionPerf("updateUserPermissionsAction", updateUserPermissionsActionImpl);
export const createRoleAction = withActionPerf("createRoleAction", createRoleActionImpl);
export const updateRoleAction = withActionPerf("updateRoleAction", updateRoleActionImpl);
export const deleteRoleAction = withActionPerf("deleteRoleAction", deleteRoleActionImpl);
