import {
  FurnitureCategory,
  InventoryMovementKind,
  InvoiceStatus,
  MaterialType,
  NotificationType,
  OfferStatus,
  Prisma,
} from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { categoryCopy } from "@/lib/company";
import type { Locale } from "@/lib/i18n";
import { localeToIntl, pickLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const productWithBomArgs = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    bomItems: {
      include: {
        material: true,
      },
    },
  },
});

type ProductWithBom = Prisma.ProductGetPayload<typeof productWithBomArgs>;

export function calculateTotals(
  subtotalCents: number,
  vatEnabled = true,
  vatRate = 18,
) {
  const vatAmountCents = vatEnabled
    ? Math.round((subtotalCents * vatRate) / 100)
    : 0;

  return {
    subtotalCents,
    vatEnabled,
    vatRate,
    vatAmountCents,
    totalCents: subtotalCents + vatAmountCents,
  };
}

export function computeProductUnitCost(product: ProductWithBom) {
  const materialsCost = product.bomItems.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.material.costPerUnitCents),
    0,
  );

  return materialsCost + product.laborCostCents;
}

export function localizeProduct(product: ProductWithBom, locale: Locale) {
  const copy = categoryCopy[product.category];
  const unitCostCents = computeProductUnitCost(product);
  return {
    id: product.id,
    slug: product.slug,
    category: product.category,
    categoryTitle: pickLocale(locale, copy.titleSq, copy.titleEn),
    categoryBody: pickLocale(locale, copy.bodySq, copy.bodyEn),
    name: locale === "sq" ? product.nameSq : product.nameEn,
    summary: locale === "sq" ? product.summarySq : product.summaryEn,
    description: locale === "sq" ? product.descriptionSq : product.descriptionEn,
    dimensions: product.dimensions,
    materialNotes:
      locale === "sq" ? product.materialNotesSq : product.materialNotesEn,
    featured: product.featured,
    basePriceCents: product.basePriceCents,
    laborCostCents: product.laborCostCents,
    unitCostCents,
    estimatedProfitCents: product.basePriceCents - unitCostCents,
    bomItems: product.bomItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      materialId: item.materialId,
      materialName: item.material.name,
      materialType: item.material.type,
      unit: item.material.unit,
      costPerUnitCents: item.material.costPerUnitCents,
    })),
  };
}

export async function getPublicProducts(locale: Locale) {
  const products = await prisma.product.findMany({
    ...productWithBomArgs,
    orderBy: [{ featured: "desc" }, { category: "asc" }, { createdAt: "desc" }],
  });

  return products.map((product) => localizeProduct(product, locale));
}

export async function getFeaturedProducts(locale: Locale) {
  const products = await getPublicProducts(locale);
  return products.filter((product) => product.featured).slice(0, 3);
}

export async function getLeadsOverview() {
  return prisma.lead.findMany({
    include: {
      client: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getClientOverview() {
  const clients = await prisma.client.findMany({
    include: {
      offers: true,
      invoices: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return clients.map((client) => {
    const outstandingDebtCents = client.invoices.reduce((sum, invoice) => {
      if (invoice.status === InvoiceStatus.PAID) {
        return sum;
      }

      return sum + (invoice.totalCents - invoice.amountPaidCents);
    }, 0);

    return {
      ...client,
      outstandingDebtCents,
      offerCount: client.offers.length,
      invoiceCount: client.invoices.length,
      lastInvoiceAt:
        client.invoices.sort(
          (left, right) =>
            new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime(),
        )[0]?.issuedAt ?? null,
    };
  });
}

export async function getInventoryOverview() {
  return prisma.material.findMany({
    include: {
      bomItems: true,
      movements: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
    },
    orderBy: [{ stockQuantity: "asc" }, { name: "asc" }],
  });
}

export async function getOfferOverview() {
  return prisma.offer.findMany({
    include: {
      client: true,
      lead: true,
      invoice: true,
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getInvoiceOverview() {
  return prisma.invoice.findMany({
    include: {
      client: true,
      offer: true,
      items: true,
    },
    orderBy: {
      issuedAt: "desc",
    },
  });
}

export async function getProductOverview(locale: Locale) {
  const products = await prisma.product.findMany({
    ...productWithBomArgs,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return products.map((product) => localizeProduct(product, locale));
}

export async function getOfferBuilderOptions(locale: Locale) {
  const [clients, leads, products] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.lead.findMany({
      where: {
        status: {
          not: "CLOSED",
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      ...productWithBomArgs,
      orderBy: [{ category: "asc" }, { nameSq: "asc" }],
    }),
  ]);

  return {
    clients,
    leads,
    products: products.map((product) => localizeProduct(product, locale)),
  };
}

export async function getInvoiceBuilderOptions(locale: Locale) {
  const [clients, products] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      ...productWithBomArgs,
      orderBy: [{ category: "asc" }, { nameSq: "asc" }],
    }),
  ]);

  return {
    clients,
    products: products.map((product) => localizeProduct(product, locale)),
  };
}

export async function getProductBuilderOptions() {
  return prisma.material.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getDashboardSnapshot(locale: Locale) {
  const [invoices, materials, notifications, leads, movements] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        client: true,
        items: true,
      },
      orderBy: {
        issuedAt: "desc",
      },
    }),
    prisma.material.findMany({
      orderBy: {
        stockQuantity: "asc",
      },
    }),
    prisma.notification.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    }),
    prisma.lead.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.inventoryMovement.findMany({
      where: {
        kind: InventoryMovementKind.CONSUMPTION,
      },
      include: {
        material: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const thisMonthInvoices = invoices.filter((invoice) => {
    const issuedAt = new Date(invoice.issuedAt);
    return issuedAt >= currentMonthStart && issuedAt <= currentMonthEnd;
  });

  const monthlyRevenueCents = thisMonthInvoices.reduce(
    (sum, invoice) => sum + invoice.totalCents,
    0,
  );
  const monthlyRevenueBeforeVatCents = thisMonthInvoices.reduce(
    (sum, invoice) => sum + invoice.subtotalCents,
    0,
  );
  const monthlyVatCents = thisMonthInvoices.reduce(
    (sum, invoice) => sum + invoice.vatAmountCents,
    0,
  );
  const monthlyProfitCents = thisMonthInvoices.reduce(
    (sum, invoice) =>
      sum +
      invoice.items.reduce(
        (inner, item) =>
          inner + (item.lineTotalCents - item.unitCostCents * item.quantity),
        0,
      ),
    0,
  );
  const outstandingDebtCents = invoices.reduce((sum, invoice) => {
    if (invoice.status === InvoiceStatus.PAID) {
      return sum;
    }

    return sum + (invoice.totalCents - invoice.amountPaidCents);
  }, 0);

  const topProductsMap = new Map<
    string,
    { name: string; quantity: number; revenueCents: number }
  >();

  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const current = topProductsMap.get(item.productName) ?? {
        name: item.productName,
        quantity: 0,
        revenueCents: 0,
      };

      current.quantity += item.quantity;
      current.revenueCents += item.lineTotalCents;
      topProductsMap.set(item.productName, current);
    }
  }

  const bestSellingProducts = Array.from(topProductsMap.values())
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 4);

  const revenueSeries = Array.from({ length: 6 }, (_, index) => {
    const month = subMonths(new Date(), 5 - index);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthInvoices = invoices.filter((invoice) => {
      const issuedAt = new Date(invoice.issuedAt);
      return issuedAt >= start && issuedAt <= end;
    });

    return {
      month: format(month, "MMM"),
      revenue: monthInvoices.reduce((sum, invoice) => sum + invoice.totalCents, 0) / 100,
      profit:
        monthInvoices.reduce(
          (sum, invoice) =>
            sum +
            invoice.items.reduce(
              (inner, item) =>
                inner + (item.lineTotalCents - item.unitCostCents * item.quantity),
              0,
            ),
          0,
        ) / 100,
      vat:
        monthInvoices.reduce((sum, invoice) => sum + invoice.vatAmountCents, 0) / 100,
    };
  });

  const materialUsageMap = new Map<string, { name: string; quantity: number }>();
  for (const movement of movements) {
    const current = materialUsageMap.get(movement.material.name) ?? {
      name: movement.material.name,
      quantity: 0,
    };
    current.quantity += movement.quantity;
    materialUsageMap.set(movement.material.name, current);
  }

  const materialUsage = Array.from(materialUsageMap.values())
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5);

  const overdueInvoices = invoices
    .filter((invoice) => invoice.status !== InvoiceStatus.PAID)
    .slice(0, 5)
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      client: invoice.client.name,
      dueDate: invoice.dueDate,
      totalCents: invoice.totalCents,
      outstandingCents: invoice.totalCents - invoice.amountPaidCents,
      status: invoice.status,
    }));

  const lowStockMaterials = materials.filter(
    (material) => material.stockQuantity <= material.lowStockThreshold,
  );

  return {
    locale,
    intlLocale: localeToIntl(locale),
    kpis: {
      monthlyRevenueCents,
      monthlyRevenueBeforeVatCents,
      monthlyVatCents,
      monthlyProfitCents,
      outstandingDebtCents,
      bestSellingProducts,
    },
    revenueSeries,
    materialUsage,
    lowStockMaterials,
    notifications,
    overdueInvoices,
    recentLeads: leads,
  };
}

export async function getReportsSnapshot(locale: Locale) {
  const [dashboard, invoices, materials, clients, products] = await Promise.all([
    getDashboardSnapshot(locale),
    prisma.invoice.findMany({
      include: {
        items: true,
        client: true,
      },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        kind: InventoryMovementKind.CONSUMPTION,
      },
      include: {
        material: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    getClientOverview(),
    getProductOverview(locale),
  ]);

  const profitByProductMap = new Map<
    string,
    { name: string; profitCents: number; quantity: number }
  >();
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const current = profitByProductMap.get(item.productName) ?? {
        name: item.productName,
        profitCents: 0,
        quantity: 0,
      };

      current.quantity += item.quantity;
      current.profitCents += item.lineTotalCents - item.unitCostCents * item.quantity;
      profitByProductMap.set(item.productName, current);
    }
  }

  const profitByProduct = Array.from(profitByProductMap.values()).sort(
    (left, right) => right.profitCents - left.profitCents,
  );

  const materialUsageMap = new Map<string, { name: string; quantity: number }>();
  for (const movement of materials) {
    const current = materialUsageMap.get(movement.material.name) ?? {
      name: movement.material.name,
      quantity: 0,
    };
    current.quantity += movement.quantity;
    materialUsageMap.set(movement.material.name, current);
  }

  return {
    dashboard,
    productMargins: products.map((product) => ({
      name: product.name,
      marginCents: product.estimatedProfitCents,
      priceCents: product.basePriceCents,
      costCents: product.unitCostCents,
    })),
    profitByProduct,
    materialUsage: Array.from(materialUsageMap.values()).sort(
      (left, right) => right.quantity - left.quantity,
    ),
    clientDebt: clients
      .filter((client) => client.outstandingDebtCents > 0)
      .sort((left, right) => right.outstandingDebtCents - left.outstandingDebtCents),
  };
}

export function statusTone(status: string) {
  if (status === OfferStatus.ACCEPTED || status === InvoiceStatus.PAID) {
    return "success" as const;
  }
  if (status === OfferStatus.REJECTED || status === InvoiceStatus.OVERDUE) {
    return "danger" as const;
  }
  if (status === InvoiceStatus.PARTIAL) {
    return "warning" as const;
  }

  return "accent" as const;
}

export function materialTypeLabel(type: MaterialType, locale: Locale) {
  const labels: Record<MaterialType, [string, string]> = {
    WOOD: ["Dru", "Wood"],
    HARDWARE: ["Furnitura", "Hardware"],
    COMPONENT: ["Komponente", "Component"],
    FINISH: ["Përfundim", "Finish"],
    ACCESSORY: ["Aksesor", "Accessory"],
  };

  return pickLocale(locale, labels[type][0], labels[type][1]);
}

export function categoryLabel(category: FurnitureCategory, locale: Locale) {
  return pickLocale(
    locale,
    categoryCopy[category].titleSq,
    categoryCopy[category].titleEn,
  );
}

export async function getInvoiceDocumentData(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      offer: true,
    },
  });
}

export async function getOfferDocumentData(id: string) {
  return prisma.offer.findUnique({
    where: { id },
    include: {
      client: true,
      lead: true,
      items: true,
      invoice: true,
    },
  });
}

export async function createLowStockNotifications() {
  const materials = await prisma.material.findMany();
  const lowStock = materials.filter(
    (material) => material.stockQuantity <= material.lowStockThreshold,
  );

  if (lowStock.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: lowStock.map((material) => ({
      type: NotificationType.LOW_STOCK,
      title: `Low stock: ${material.name}`,
      message: `${material.name} dropped to ${material.stockQuantity} ${material.unit.toLowerCase()}.`,
      href: "/en/admin/inventory",
    })),
  });
}
