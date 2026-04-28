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
  getPermissionTemplateForRoleRecord,
  isOwnerUser,
  unauthorizedMessage,
} from "@/lib/permissions";
import {
  permissionActions,
  permissionModules,
  type PermissionMatrix,
} from "@/lib/permissions-config";
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
  purchaseInvoiceSchema,
  purchaseInvoiceUpdateSchema,
  roleSchema,
  supplierSchema,
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

async function getActiveClientVatRate(clientId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      deletedAt: null,
    },
    select: {
      vatRate: true,
    },
  });

  if (!client) {
    throw new Error("Selected client could not be found.");
  }

  return client.vatRate;
}

async function getActiveSupplierVatRate(supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      deletedAt: null,
    },
    select: {
      vatRate: true,
    },
  });

  if (!supplier) {
    throw new Error("Selected supplier could not be found.");
  }

  return supplier.vatRate;
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
      : Math.round(requestedAmount * 100);

  return Math.min(Math.max(requestedAmountCents, 0), totalCents);
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

export async function createClientAction(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "CLIENTS", "CREATE");

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    nui: formData.get("nui"),
    vatRate: formData.get("vatRate"),
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
    nui: formData.get("nui"),
    vatRate: formData.get("vatRate"),
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

export async function createSupplierAction(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "PURCHASE_INVOICES", "CREATE");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    nui: formData.get("nui"),
    vatRate: formData.get("vatRate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier payload.");
  }

  await prisma.supplier.create({
    data: parsed.data,
  });

  revalidateEveryLocale("/admin/purchase-invoices");
}

export async function updateSupplierAction(
  locale: Locale,
  supplierId: string,
  formData: FormData,
) {
  await ensureAllowed(locale, "PURCHASE_INVOICES", "EDIT");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    nui: formData.get("nui"),
    vatRate: formData.get("vatRate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid supplier payload.");
  }

  await prisma.supplier.update({
    where: { id: supplierId },
    data: parsed.data,
  });

  revalidateEveryLocale("/admin/purchase-invoices");
}

export async function deleteSupplierAction(locale: Locale, supplierId: string) {
  await ensureAllowed(locale, "PURCHASE_INVOICES", "DELETE");

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      purchaseInvoices: { select: { id: true }, take: 1 },
    },
  });

  if (!supplier) {
    revalidateEveryLocale("/admin/purchase-invoices");
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

  revalidateEveryLocale("/admin/purchase-invoices");
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

  const { costPerUnit, ...materialData } = parsed.data;

  await prisma.material.create({
    data: {
      ...materialData,
      costPerUnitCents: Math.round(costPerUnit * 100),
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
    materialId: string;
    quantity: number;
    unitPrice: number;
  }>;
  const rawClientId = formData.get("clientId");
  const clientVatRate =
    typeof rawClientId === "string" && rawClientId.length > 0
      ? await getActiveClientVatRate(rawClientId)
      : 18;

  const parsed = offerSchema.safeParse({
    clientId: rawClientId,
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: clientVatRate,
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

    const unitPriceCents = Math.round(item.unitPrice * 100);

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
    offer.client.vatRate,
  );
  const validUntil = String(formData.get("validUntil") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.offer.update({
    where: { id: offerId },
    data: {
      status: status as OfferStatus,
      validUntil: validUntil ? new Date(validUntil) : offer.validUntil,
      notes: notes.length > 0 ? notes : null,
      ...totals,
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

export async function createInvoiceAction(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "INVOICES", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    materialId: string;
    quantity: number;
    unitPrice: number;
  }>;
  const rawClientId = formData.get("clientId");
  const clientVatRate =
    typeof rawClientId === "string" && rawClientId.length > 0
      ? await getActiveClientVatRate(rawClientId)
      : 18;

  const parsed = invoiceSchema.safeParse({
    clientId: rawClientId,
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: clientVatRate,
    amountPaid: formData.get("amountPaid"),
    items: itemsData.map((item) => offerItemSchema.parse(item)),
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

    const unitPriceCents = Math.round(item.unitPrice * 100);

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

  const invoiceCount = await prisma.invoice.count();
  const invoice = await prisma.invoice.create({
    data: {
      number: `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, "0")}`,
      clientId: parsed.data.clientId,
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
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
    vatRate: 18,
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
    invoice.client.vatRate,
  );

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
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

export async function deleteInvoiceAction(locale: Locale, invoiceId: string) {
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

export async function createPurchaseInvoiceAction(locale: Locale, formData: FormData) {
  await ensureAllowed(locale, "PURCHASE_INVOICES", "CREATE");

  const itemsData = JSON.parse(String(formData.get("itemsData") ?? "[]")) as Array<{
    materialId: string;
    quantity: number;
    unitPrice: number;
  }>;
  const rawSupplierId = formData.get("supplierId");
  const supplierVatRate =
    typeof rawSupplierId === "string" && rawSupplierId.length > 0
      ? await getActiveSupplierVatRate(rawSupplierId)
      : 18;

  const parsed = purchaseInvoiceSchema.safeParse({
    supplierId: rawSupplierId,
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
    vatEnabled: parseCheckbox(formData, "vatEnabled"),
    vatRate: supplierVatRate,
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

    const unitPriceCents = Math.round(item.unitPrice * 100);

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

  const purchaseInvoiceCount = await prisma.purchaseInvoice.count();
  const purchaseInvoice = await prisma.purchaseInvoice.create({
    data: {
      number: `PINV-${new Date().getFullYear()}-${String(purchaseInvoiceCount + 1).padStart(3, "0")}`,
      supplierId: parsed.data.supplierId,
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
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

export async function updatePurchaseInvoiceAction(
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
    vatRate: 18,
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
    purchaseInvoice.supplier.vatRate,
  );

  await prisma.purchaseInvoice.update({
    where: { id: purchaseInvoiceId },
    data: {
      status: parsed.data.status,
      dueDate: new Date(parsed.data.dueDate),
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

export async function deletePurchaseInvoiceAction(
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
  const rolePermissions = getPermissionTemplateForRoleRecord(role);
  await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: fallbackUserRole(role),
        roleId: role.id,
      },
    });

    await tx.userPermission.createMany({
      data: userPermissionRows(createdUser.id, rolePermissions),
    });
  });

  revalidateEveryLocale("/admin/users");
  revalidateEveryLocale("/admin/roles");
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

  const rolePermissions = getPermissionTemplateForRoleRecord(role);
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
  revalidateEveryLocale("/admin/roles");
}

export async function deleteUserAction(locale: Locale, userId: string) {
  const actor = await ensureAllowed(locale, "USERS", "DELETE");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { roleRecord: true },
  });

  if (!target) {
    throw new Error("User not found.");
  }

  if (target.id === actor.id || target.roleRecord?.isOwner || target.role === "OWNER") {
    throw new Error(unauthorizedMessage(locale));
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidateEveryLocale("/admin/users");
  revalidateEveryLocale("/admin/roles");
}

export async function updateUserPermissionsAction(
  locale: Locale,
  userId: string,
  formData: FormData,
) {
  await assertOwner(locale);

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

  await prisma.$transaction(userPermissionOperations(userId, formData));

  revalidateEveryLocale("/admin/roles");
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
