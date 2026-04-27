"use server";

import {
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
  isOwnerUser,
  unauthorizedMessage,
} from "@/lib/permissions";
import { permissionActions, permissionModules } from "@/lib/permissions-config";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import {
  clientSchema,
  inventoryAdjustmentSchema,
  invoiceSchema,
  invoiceUpdateSchema,
  leadStatusSchema,
  materialSchema,
  offerItemSchema,
  offerSchema,
  productBomItemSchema,
  productSchema,
  roleSchema,
  userCreateSchema,
  userRoleSchema,
} from "@/lib/validators";

function revalidateEveryLocale(path: string) {
  revalidatePath(`/sq${path}`);
  revalidatePath(`/en${path}`);
}

function parseCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
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

export async function createClientAction(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "CLIENTS", "CREATE");

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
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

export async function updateClientAction(
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

export async function deleteClientAction(locale: Locale, clientId: string) {
  await ensureAllowed(locale, "CLIENTS", "DELETE");

  await prisma.client.delete({
    where: { id: clientId },
  });

  revalidateEveryLocale("/admin/clients");
}

export async function convertLeadToClientAction(locale: Locale, leadId: string) {
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

export async function updateLeadStatusAction(
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

export async function deleteLeadAction(locale: Locale, leadId: string) {
  await ensureAllowed(locale, "LEADS", "DELETE");

  await prisma.lead.delete({
    where: { id: leadId },
  });

  revalidateEveryLocale("/admin/leads");
}

export async function createMaterialAction(locale: Locale, formData: FormData) {
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

  await prisma.material.create({
    data: {
      ...parsed.data,
      costPerUnitCents: Math.round(parsed.data.costPerUnit * 100),
    },
  });

  revalidateEveryLocale("/admin/inventory");
}

export async function updateMaterialAction(
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
      costPerUnitCents: Math.round(parsed.data.costPerUnit * 100),
      notes: parsed.data.notes,
    },
  });

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/inventory");
}

export async function deleteMaterialAction(locale: Locale, materialId: string) {
  await ensureAllowed(locale, "INVENTORY", "DELETE");

  await prisma.material.delete({
    where: { id: materialId },
  });

  revalidateEveryLocale("/admin/inventory");
}

export async function adjustInventoryAction(
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

export async function createProductAction(locale: Locale, formData: FormData) {
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
      basePriceCents: Math.round(parsed.data.basePrice * 100),
      laborCostCents: Math.round(parsed.data.laborCost * 100),
      bomItems: {
        create: parsed.data.bom,
      },
    },
  });

  revalidateEveryLocale("/admin/products");
  revalidateEveryLocale("/furniture");
  revalidateEveryLocale("/");
}

export async function createOfferAction(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "OFFERS", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;

  const parsed = offerSchema.safeParse({
    clientId: formData.get("clientId"),
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: formData.get("vatRate"),
    items: itemsData.map((item) => offerItemSchema.parse(item)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid offer payload.");
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: parsed.data.items.map((item) => item.productId),
      },
    },
    include: {
      bomItems: {
        include: {
          material: true,
        },
      },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  const lineItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("Selected product could not be found.");
    }

    const unitPriceCents = Math.round(item.unitPrice * 100);
    const unitCostCents =
      product.laborCostCents +
      product.bomItems.reduce(
        (sum, bomItem) =>
          sum + Math.round(bomItem.quantity * bomItem.material.costPerUnitCents),
        0,
      );

    return {
      productId: product.id,
      productName: product.nameSq,
      description: product.summarySq,
      quantity: item.quantity,
      unitPriceCents,
      unitCostCents,
      lineTotalCents: unitPriceCents * item.quantity,
    };
  });

  const totals = calculateTotals(
    lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  const offerCount = await prisma.offer.count();
  await prisma.offer.create({
    data: {
      number: `OF-${new Date().getFullYear()}-${String(offerCount + 1).padStart(3, "0")}`,
      clientId: parsed.data.clientId,
      leadId: parsed.data.leadId,
      status: parsed.data.status,
      validUntil: new Date(parsed.data.validUntil),
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

export async function updateOfferStatusAction(
  locale: Locale,
  offerId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "OFFERS", "EDIT");

  const status = String(formData.get("status") ?? "");
  if (!Object.values(OfferStatus).includes(status as OfferStatus)) {
    throw new Error("Invalid offer status.");
  }

  await prisma.offer.update({
    where: { id: offerId },
    data: {
      status: status as OfferStatus,
    },
  });

  revalidateEveryLocale("/admin/offers");
}

export async function deleteOfferAction(locale: Locale, offerId: string) {
  await ensureAllowed(locale, "OFFERS", "DELETE");

  await prisma.offer.delete({
    where: { id: offerId },
  });

  revalidateEveryLocale("/admin/offers");
}

async function deductInventoryForInvoice(
  invoiceId: string,
  items: Array<{ productId: string | null; quantity: number }>,
) {
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

export async function createInvoiceAction(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "INVOICES", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;

  const parsed = invoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: formData.get("vatRate"),
    items: itemsData.map((item) => offerItemSchema.parse(item)),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice payload.");
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: parsed.data.items.map((item) => item.productId),
      },
    },
    include: {
      bomItems: {
        include: {
          material: true,
        },
      },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  const lineItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("Selected product could not be found.");
    }

    const unitPriceCents = Math.round(item.unitPrice * 100);
    const unitCostCents =
      product.laborCostCents +
      product.bomItems.reduce(
        (sum, bomItem) =>
          sum + Math.round(bomItem.quantity * bomItem.material.costPerUnitCents),
        0,
      );

    return {
      productId: product.id,
      productName: locale === "sq" ? product.nameSq : product.nameEn,
      description: locale === "sq" ? product.summarySq : product.summaryEn,
      quantity: item.quantity,
      unitPriceCents,
      unitCostCents,
      lineTotalCents: unitPriceCents * item.quantity,
    };
  });

  const totals = calculateTotals(
    lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0),
    parsed.data.vatEnabled,
    parsed.data.vatRate,
  );

  const invoiceCount = await prisma.invoice.count();
  const invoice = await prisma.invoice.create({
    data: {
      number: `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, "0")}`,
      clientId: parsed.data.clientId,
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
      notes: parsed.data.notes,
      amountPaidCents: parsed.data.status === InvoiceStatus.PAID ? totals.totalCents : 0,
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
      quantity: item.quantity,
    })),
  );

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/inventory");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

export async function convertOfferToInvoiceAction(locale: Locale, offerId: string) {
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
      dueDate: addDays(new Date(), 14),
      ...calculateTotals(offer.subtotalCents, offer.vatEnabled, offer.vatRate),
      items: {
        create: offer.items.map((item) => ({
          productId: item.productId,
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
      quantity: item.quantity,
    })),
  );

  await createLowStockNotifications();
  revalidateEveryLocale("/admin/offers");
  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/inventory");
  revalidateEveryLocale("/admin");
}

export async function updateInvoiceAction(
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
    vatRate: formData.get("vatRate"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice payload.");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
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
    parsed.data.vatRate,
  );

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
      notes: parsed.data.notes,
      ...totals,
      amountPaidCents:
        parsed.data.status === InvoiceStatus.PAID
          ? totals.totalCents
          : parsed.data.status === InvoiceStatus.UNPAID ||
              parsed.data.status === InvoiceStatus.OVERDUE
            ? 0
            : invoice.amountPaidCents,
      paidAt: parsed.data.status === InvoiceStatus.PAID ? new Date() : null,
    },
  });

  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

export async function deleteInvoiceAction(locale: Locale, invoiceId: string) {
  await ensureAllowed(locale, "INVOICES", "DELETE");

  await prisma.invoice.delete({
    where: { id: invoiceId },
  });

  revalidateEveryLocale("/admin/invoices");
  revalidateEveryLocale("/admin/reports");
  revalidateEveryLocale("/admin");
}

export async function createUserAction(locale: Locale, formData: FormData) {
  const actor = await ensureAllowed(locale, "USERS", "CREATE");
  const parsed = userCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user payload.");
  }

  const role = await getRoleForAssignment(parsed.data.roleId);
  if (role.isOwner && !isOwnerUser(actor)) {
    throw new Error(unauthorizedMessage(locale));
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: fallbackUserRole(role),
      roleId: role.id,
    },
  });

  revalidateEveryLocale("/admin/users");
}

export async function updateUserRoleAction(
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
  await prisma.user.update({
    where: { id: userId },
    data: {
      role: fallbackUserRole(role),
      roleId: role.id,
    },
  });

  revalidateEveryLocale("/admin/users");
}

export async function deleteUserAction(locale: Locale, userId: string) {
  await ensureAllowed(locale, "USERS", "DELETE");
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

  await prisma.user.delete({
    where: { id: userId },
  });

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

export async function createRoleAction(locale: Locale, formData: FormData) {
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

export async function updateRoleAction(
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

export async function deleteRoleAction(locale: Locale, roleId: string) {
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
