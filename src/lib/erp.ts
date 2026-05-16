import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  FurnitureCategory,
  InventoryMovementKind,
  InvoiceStatus,
  MaterialType,
  NotificationType,
  OfferStatus,
  Prisma,
  type Material,
} from "@prisma/client";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { categoryCopy } from "@/lib/company";
import { publicProductCatalog } from "@/data/product-catalog";
import type { Locale } from "@/lib/i18n";
import { localeToIntl, pickLocale } from "@/lib/i18n";
import {
  DEFAULT_PAGE_SIZE,
  paginatedSliceResult,
  paginationSliceArgs,
  type PaginatedResult,
} from "@/lib/pagination";
import { measureAsync, measureDetailAsync, measureDetailSync } from "@/lib/perf";
import { prisma } from "@/lib/prisma";
import { calculatePercentageCents, multiplyCentsByDecimal } from "@/lib/money";

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

type ListQuery = {
  page?: number;
  pageSize?: number;
  query?: string;
  sort?: string;
  direction?: "asc" | "desc";
};

function contains(value: string | undefined) {
  return value?.trim() ? { contains: value.trim(), mode: "insensitive" as const } : undefined;
}

function sortDirection(direction: ListQuery["direction"]) {
  return direction === "asc" ? "asc" : "desc";
}

function measureAdminMainQuery<T>(
  pageLabel: string,
  callback: () => Promise<T>,
  context?: Record<string, string | number | boolean | null | undefined>,
) {
  return measureDetailAsync(`${pageLabel}.main data query`, callback, context);
}

function measureAdminAuxQuery<T>(
  pageLabel: string,
  callback: () => Promise<T>,
  context?: Record<string, string | number | boolean | null | undefined>,
) {
  return measureDetailAsync(`${pageLabel}.builder/options query`, callback, context);
}

function measureAdminMapping<T>(
  pageLabel: string,
  callback: () => T,
  context?: Record<string, string | number | boolean | null | undefined>,
) {
  return measureDetailSync(`${pageLabel}.table mapping/formatting`, callback, context);
}

export function calculateTotals(
  subtotalCents: number,
  vatEnabled = true,
  vatRate = 18,
) {
  const vatAmountCents = vatEnabled
    ? calculatePercentageCents(subtotalCents, vatRate)
    : 0;

  return {
    subtotalCents,
    vatEnabled,
    vatRate,
    vatAmountCents,
    totalCents: subtotalCents + vatAmountCents,
  };
}

function suggestedDocumentNumber(prefix: string, count: number) {
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
}

type InvoiceDebtInput = {
  status: InvoiceStatus;
  totalCents: number;
  amountPaidCents: number;
  debitNotes?: Array<{ totalCents: number }>;
};

export function getInvoiceAdjustmentCents(invoice: InvoiceDebtInput) {
  return (invoice.debitNotes ?? []).reduce(
    (sum, debitNote) => sum + debitNote.totalCents,
    0,
  );
}

export function getAdjustedInvoiceOutstandingCents(invoice: InvoiceDebtInput) {
  if (invoice.status === InvoiceStatus.PAID) {
    return 0;
  }

  return Math.max(
    invoice.totalCents - invoice.amountPaidCents - getInvoiceAdjustmentCents(invoice),
    0,
  );
}

export function computeProductUnitCost(product: ProductWithBom) {
  const materialsCost = product.bomItems.reduce(
    (sum, item) => sum + multiplyCentsByDecimal(item.material.costPerUnitCents, item.quantity),
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

function localizeCatalogProduct(
  product: (typeof publicProductCatalog)[number],
  locale: Locale,
) {
  const copy = categoryCopy[product.category];
  const unitCostCents = product.laborCostCents;

  return {
    id: product.slug,
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
    bomItems: [],
  };
}

export async function getPublicProducts(locale: Locale) {
  return publicProductCatalog
    .map((product) => localizeCatalogProduct(product, locale))
    .sort((left, right) => {
      if (left.featured !== right.featured) {
        return left.featured ? -1 : 1;
      }

      if (left.category !== right.category) {
        return left.category.localeCompare(right.category);
      }

      return 0;
    });
}

export async function getFeaturedProducts(locale: Locale) {
  const products = await getPublicProducts(locale);
  return products.filter((product) => product.featured).slice(0, 6);
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

export async function getQuoteRequestOverview() {
  return prisma.quoteRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

type QuoteRequestOverview = Awaited<ReturnType<typeof getQuoteRequestOverview>>[number];

export async function getQuoteRequestOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "createdAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<QuoteRequestOverview>> {
  const search = contains(query);
  const where: Prisma.QuoteRequestWhereInput = search
    ? {
        OR: [
          { name: search },
          { phone: search },
          { email: search },
          { details: search },
        ],
      }
    : {};
  const orderBy: Prisma.QuoteRequestOrderByWithRelationInput =
    sort === "name"
      ? { name: direction }
      : sort === "status"
        ? { status: direction }
        : { createdAt: sortDirection(direction) };

  const items = await measureAdminMainQuery("admin/leads", () =>
    prisma.quoteRequest.findMany({
      where,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

export async function getClientOverview() {
  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      offers: true,
      invoices: {
        include: {
          debitNotes: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return clients.map((client) => {
    const outstandingDebtCents = client.invoices.reduce(
      (sum, invoice) => sum + getAdjustedInvoiceOutstandingCents(invoice),
      0,
    );

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
  return measureAdminMainQuery("admin/inventory", () =>
    prisma.material.findMany({
      orderBy: [{ stockQuantity: "asc" }, { name: "asc" }],
    }),
  );
}

type InventoryOverview = Awaited<ReturnType<typeof getInventoryOverview>>[number];

function materialTypesForSearch(query: string | undefined, locale: Locale) {
  const normalized = query?.trim().toLocaleLowerCase();
  if (!normalized) {
    return [];
  }

  return Object.values(MaterialType).filter((type) => {
    return (
      type.toLocaleLowerCase().includes(normalized) ||
      materialTypeLabel(type, locale).toLocaleLowerCase().includes(normalized)
    );
  });
}

export async function getInventoryOverviewPage({
  locale,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "stock",
  direction = "asc",
}: ListQuery & { locale: Locale }): Promise<PaginatedResult<InventoryOverview>> {
  const search = contains(query);
  const typeMatches = materialTypesForSearch(query, locale);
  const where: Prisma.MaterialWhereInput = search
    ? {
        OR: [
          { name: search },
          { sku: search },
          { notes: search },
          ...(typeMatches.length > 0 ? [{ type: { in: typeMatches } }] : []),
        ],
      }
    : {};
  const orderBy: Prisma.MaterialOrderByWithRelationInput[] =
    sort === "material"
      ? [{ name: direction }]
      : sort === "type"
        ? [{ type: direction }, { name: "asc" }]
        : sort === "threshold"
          ? [{ lowStockThreshold: sortDirection(direction) }, { name: "asc" }]
          : sort === "cost"
            ? [{ costPerUnitCents: sortDirection(direction) }, { name: "asc" }]
            : [{ stockQuantity: sortDirection(direction) }, { name: "asc" }];

  const items = await measureAdminMainQuery("admin/inventory", () =>
    prisma.material.findMany({
      where,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

export function localizeInventoryItem(
  material: Pick<Material, "id" | "name" | "sku" | "type" | "unit" | "costPerUnitCents">,
  locale: Locale,
) {
  return {
    id: material.id,
    name: material.name,
    sku: material.sku,
    unit: material.unit,
    categoryTitle: materialTypeLabel(material.type, locale),
    unitPriceCents: material.costPerUnitCents,
    costPerUnitCents: material.costPerUnitCents,
  };
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
      debitNotes: true,
    },
    orderBy: {
      issuedAt: "desc",
    },
  });
}

export async function getPurchaseInvoiceOverview() {
  return prisma.purchaseInvoice.findMany({
    include: {
      supplier: true,
      items: true,
    },
    orderBy: {
      issuedAt: "desc",
    },
  });
}

const offerOverviewPageArgs = Prisma.validator<Prisma.OfferDefaultArgs>()({
  select: {
    id: true,
    number: true,
    status: true,
    notes: true,
    subtotalCents: true,
    vatEnabled: true,
    vatRate: true,
    vatAmountCents: true,
    totalCents: true,
    validUntil: true,
    createdAt: true,
    client: { select: { id: true, name: true } },
    lead: { select: { id: true, name: true } },
    invoice: { select: { id: true } },
    items: { select: { id: true, productName: true } },
  },
});

type OfferOverviewPage = Prisma.OfferGetPayload<typeof offerOverviewPageArgs>;

export async function getOfferOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "createdAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<OfferOverviewPage>> {
  const search = contains(query);
  const where: Prisma.OfferWhereInput = search
    ? {
        OR: [
          { number: search },
          { notes: search },
          { client: { name: search } },
          { lead: { name: search } },
          { items: { some: { productName: search } } },
        ],
      }
    : {};
  const orderBy: Prisma.OfferOrderByWithRelationInput =
    sort === "client"
      ? { client: { name: direction } }
      : sort === "status"
        ? { status: direction }
        : sort === "validUntil"
          ? { validUntil: sortDirection(direction) }
          : sort === "total"
            ? { totalCents: sortDirection(direction) }
            : sort === "number"
              ? { number: direction }
              : { createdAt: sortDirection(direction) };

  const items = await measureAdminMainQuery("admin/offers", () =>
    prisma.offer.findMany({
      where,
      ...offerOverviewPageArgs,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

const invoiceOverviewPageArgs = Prisma.validator<Prisma.InvoiceDefaultArgs>()({
  select: {
    id: true,
    number: true,
    status: true,
    notes: true,
    subtotalCents: true,
    vatEnabled: true,
    vatRate: true,
    vatAmountCents: true,
    totalCents: true,
    amountPaidCents: true,
    dueDate: true,
    issuedAt: true,
    client: { select: { id: true, name: true } },
    offer: { select: { id: true } },
    items: {
      select: {
        id: true,
        productName: true,
        quantity: true,
        unitPriceCents: true,
      },
    },
    debitNotes: { select: { totalCents: true } },
  },
});

type InvoiceOverviewPage = Prisma.InvoiceGetPayload<typeof invoiceOverviewPageArgs>;

export async function getInvoiceOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "issuedAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<InvoiceOverviewPage>> {
  const search = contains(query);
  const where: Prisma.InvoiceWhereInput = search
    ? {
        OR: [
          { number: search },
          { notes: search },
          { client: { name: search } },
          { items: { some: { productName: search } } },
        ],
      }
    : {};
  const orderBy: Prisma.InvoiceOrderByWithRelationInput =
    sort === "client"
      ? { client: { name: direction } }
      : sort === "status"
        ? { status: direction }
        : sort === "dueDate"
          ? { dueDate: sortDirection(direction) }
          : sort === "total"
            ? { totalCents: sortDirection(direction) }
            : sort === "number"
              ? { number: direction }
              : { issuedAt: sortDirection(direction) };

  const items = await measureAdminMainQuery("admin/invoices", () =>
    prisma.invoice.findMany({
      where,
      ...invoiceOverviewPageArgs,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

type PurchaseInvoiceOverview = Awaited<ReturnType<typeof getPurchaseInvoiceOverview>>[number];

export async function getPurchaseInvoiceOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "issuedAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<PurchaseInvoiceOverview>> {
  const search = contains(query);
  const where: Prisma.PurchaseInvoiceWhereInput = search
    ? {
        OR: [
          { number: search },
          { notes: search },
          { supplier: { name: search } },
          { items: { some: { productName: search } } },
        ],
      }
    : {};
  const orderBy: Prisma.PurchaseInvoiceOrderByWithRelationInput =
    sort === "supplier"
      ? { supplier: { name: direction } }
      : sort === "status"
        ? { status: direction }
        : sort === "dueDate"
          ? { dueDate: sortDirection(direction) }
          : sort === "total"
            ? { totalCents: sortDirection(direction) }
            : sort === "number"
              ? { number: direction }
              : { issuedAt: sortDirection(direction) };

  const items = await measureAdminMainQuery("admin/purchase-invoices", () =>
    prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: true,
        items: true,
      },
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

export async function getClientOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "name",
  direction = "asc",
}: ListQuery) {
  const search = contains(query);
  const where: Prisma.ClientWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: search },
            { contactPerson: search },
            { email: search },
            { phone: search },
            { address: search },
            { nui: search },
            { vatNumber: search },
            { notes: search },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ClientOrderByWithRelationInput =
    sort === "activity"
      ? { invoices: { _count: sortDirection(direction) } }
      : sort === "lastInvoice"
        ? { invoices: { _count: sortDirection(direction) } }
        : { name: direction };

  const clients = await measureAdminMainQuery("admin/clients", () =>
    prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        contactPerson: true,
        email: true,
        phone: true,
        address: true,
        nui: true,
        vatNumber: true,
        notes: true,
        offers: { select: { id: true } },
        invoices: {
          select: {
            issuedAt: true,
            status: true,
            totalCents: true,
            amountPaidCents: true,
            debitNotes: { select: { totalCents: true } },
          },
        },
      },
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  const items = measureAdminMapping("admin/clients", () =>
    clients.map((client) => {
      const outstandingDebtCents = client.invoices.reduce(
        (sum, invoice) => sum + getAdjustedInvoiceOutstandingCents(invoice),
        0,
      );

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
    }),
  );

  if (sort === "debt") {
    items.sort((left, right) =>
      direction === "asc"
        ? left.outstandingDebtCents - right.outstandingDebtCents
        : right.outstandingDebtCents - left.outstandingDebtCents,
    );
  }

  return paginatedSliceResult({ items, page, pageSize });
}

export async function getDeliveryNoteOverview() {
  return prisma.deliveryNote.findMany({
    include: {
      client: true,
      supplier: true,
      items: true,
    },
    orderBy: {
      issuedAt: "desc",
    },
  });
}

type DeliveryNoteOverview = Awaited<ReturnType<typeof getDeliveryNoteOverview>>[number];

export async function getDeliveryNoteOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "issuedAt",
  direction = "desc",
  type,
}: ListQuery & { type?: string }): Promise<PaginatedResult<DeliveryNoteOverview>> {
  const search = contains(query);
  const noteType =
    type === DeliveryNoteType.SALES || type === DeliveryNoteType.PURCHASE
      ? type
      : undefined;
  const where: Prisma.DeliveryNoteWhereInput = {
    ...(noteType ? { type: noteType } : {}),
    ...(search
      ? {
          OR: [
            { number: search },
            { notes: search },
            { client: { name: search } },
            { supplier: { name: search } },
            { items: { some: { productName: search } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.DeliveryNoteOrderByWithRelationInput =
    sort === "number"
      ? { number: direction }
      : sort === "status"
        ? { status: direction }
        : { issuedAt: sortDirection(direction) };

  const items = await measureAdminMainQuery("admin/delivery-notes", () =>
    prisma.deliveryNote.findMany({
      where,
      include: {
        client: true,
        supplier: true,
        items: true,
      },
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

export async function getExpenseOverview() {
  return prisma.expense.findMany({
    orderBy: {
      date: "desc",
    },
  });
}

type ExpenseOverview = Awaited<ReturnType<typeof getExpenseOverview>>[number];

export async function getExpenseOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "date",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<ExpenseOverview>> {
  const search = contains(query);
  const where: Prisma.ExpenseWhereInput = search
    ? {
        OR: [
          { name: search },
          { supplierName: search },
          { description: search },
        ],
      }
    : {};
  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    sort === "name"
      ? { name: direction }
      : sort === "category"
        ? { category: direction }
        : sort === "total"
          ? { totalCents: sortDirection(direction) }
          : { date: sortDirection(direction) };

  const items = await measureAdminMainQuery("admin/expenses", () =>
    prisma.expense.findMany({
      where,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

export async function getDebitNoteOverview() {
  return prisma.debitNote.findMany({
    include: {
      client: true,
      invoice: {
        include: {
          debitNotes: true,
        },
      },
      items: {
        include: {
          invoiceItem: true,
        },
      },
    },
    orderBy: {
      issuedAt: "desc",
    },
  });
}

const debitNoteOverviewPageArgs = Prisma.validator<Prisma.DebitNoteDefaultArgs>()({
  select: {
    id: true,
    number: true,
    reason: true,
    notes: true,
    subtotalCents: true,
    vatEnabled: true,
    vatRate: true,
    vatAmountCents: true,
    totalCents: true,
    issuedAt: true,
    client: { select: { id: true, name: true } },
    invoice: {
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        amountPaidCents: true,
        debitNotes: { select: { totalCents: true } },
      },
    },
    items: {
      select: {
        id: true,
        productName: true,
        quantity: true,
        unitPriceCents: true,
      },
    },
  },
});

type DebitNoteOverviewPage = Prisma.DebitNoteGetPayload<typeof debitNoteOverviewPageArgs>;

export async function getDebitNoteOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "issuedAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<DebitNoteOverviewPage>> {
  const search = contains(query);
  const where: Prisma.DebitNoteWhereInput = search
    ? {
        OR: [
          { number: search },
          { notes: search },
          { client: { name: search } },
          { invoice: { number: search } },
          { items: { some: { productName: search } } },
        ],
      }
    : {};
  const orderBy: Prisma.DebitNoteOrderByWithRelationInput =
    sort === "number"
      ? { number: direction }
      : sort === "client"
        ? { client: { name: direction } }
        : sort === "total"
          ? { totalCents: sortDirection(direction) }
          : { issuedAt: sortDirection(direction) };

  const items = await measureAdminMainQuery("admin/debit-notes", () =>
    prisma.debitNote.findMany({
      where,
      ...debitNoteOverviewPageArgs,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

export async function getSupplierOverview() {
  const suppliers = await prisma.supplier.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      purchaseInvoices: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return suppliers.map((supplier) => {
    const outstandingDebtCents = supplier.purchaseInvoices.reduce((sum, invoice) => {
      if (invoice.status === InvoiceStatus.PAID) {
        return sum;
      }

      return sum + (invoice.totalCents - invoice.amountPaidCents);
    }, 0);

    return {
      ...supplier,
      outstandingDebtCents,
      purchaseInvoiceCount: supplier.purchaseInvoices.length,
      lastPurchaseInvoiceAt:
        supplier.purchaseInvoices.sort(
          (left, right) =>
            new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime(),
        )[0]?.issuedAt ?? null,
    };
  });
}

export async function getSupplierOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "name",
  direction = "asc",
}: ListQuery) {
  const search = contains(query);
  const where: Prisma.SupplierWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: search },
            { contactPerson: search },
            { email: search },
            { phone: search },
            { address: search },
            { nui: search },
            { vatNumber: search },
            { notes: search },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.SupplierOrderByWithRelationInput =
    sort === "activity"
      ? { purchaseInvoices: { _count: sortDirection(direction) } }
      : { name: direction };

  const suppliers = await measureAdminMainQuery("admin/suppliers", () =>
    prisma.supplier.findMany({
      where,
      include: {
        purchaseInvoices: {
          select: {
            issuedAt: true,
            status: true,
            totalCents: true,
            amountPaidCents: true,
          },
        },
      },
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  const items = measureAdminMapping("admin/suppliers", () =>
    suppliers.map((supplier) => {
      const outstandingDebtCents = supplier.purchaseInvoices.reduce((sum, invoice) => {
        if (invoice.status === InvoiceStatus.PAID) {
          return sum;
        }

        return sum + (invoice.totalCents - invoice.amountPaidCents);
      }, 0);

      return {
        ...supplier,
        outstandingDebtCents,
        purchaseInvoiceCount: supplier.purchaseInvoices.length,
        lastPurchaseInvoiceAt:
          supplier.purchaseInvoices.sort(
            (left, right) =>
              new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime(),
          )[0]?.issuedAt ?? null,
      };
    }),
  );

  if (sort === "debt") {
    items.sort((left, right) =>
      direction === "asc"
        ? left.outstandingDebtCents - right.outstandingDebtCents
        : right.outstandingDebtCents - left.outstandingDebtCents,
    );
  }

  return paginatedSliceResult({ items, page, pageSize });
}

type AssetInventoryOverview = Prisma.AssetInventoryGetPayload<Prisma.AssetInventoryDefaultArgs>;

export async function getAssetInventoryOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "purchaseDate",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<AssetInventoryOverview>> {
  const search = contains(query);
  const where: Prisma.AssetInventoryWhereInput = search
    ? { name: search }
    : {};
  const orderBy: Prisma.AssetInventoryOrderByWithRelationInput[] =
    sort === "name"
      ? [{ name: direction }]
      : sort === "quantity"
        ? [{ quantity: sortDirection(direction) }, { name: "asc" }]
        : sort === "value"
          ? [{ valueCents: sortDirection(direction) }, { name: "asc" }]
          : [{ purchaseDate: sortDirection(direction) }, { createdAt: "desc" }];

  const items = await measureAdminMainQuery("admin/assets-inventory", () =>
    prisma.assetInventory.findMany({
      where,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

const stokOverviewArgs = Prisma.validator<Prisma.StokDefaultArgs>()({
  include: {
    items: {
      orderBy: [{ createdAt: "asc" }],
      include: {
        material: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            stockQuantity: true,
          },
        },
      },
    },
  },
});

type StokOverview = Prisma.StokGetPayload<typeof stokOverviewArgs>;

export async function getStokOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "name",
  direction = "asc",
}: ListQuery): Promise<PaginatedResult<StokOverview>> {
  const search = contains(query);
  const where: Prisma.StokWhereInput = search
    ? {
        OR: [
          { name: search },
          { items: { some: { material: { name: search } } } },
          { items: { some: { material: { sku: search } } } },
        ],
      }
    : {};
  const orderBy: Prisma.StokOrderByWithRelationInput[] =
    sort === "price"
      ? [{ priceCents: sortDirection(direction) }, { name: "asc" }]
      : sort === "items"
        ? [{ items: { _count: sortDirection(direction) } }, { name: "asc" }]
        : [{ name: direction }, { createdAt: "desc" }];

  const items = await measureAdminMainQuery("admin/stoqet", () =>
    prisma.stok.findMany({
      ...stokOverviewArgs,
      where,
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

export async function getProductOverview(locale: Locale) {
  const products = await prisma.product.findMany({
    ...productWithBomArgs,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return products.map((product) => localizeProduct(product, locale));
}

export async function getOfferBuilderOptions(locale: Locale) {
  const [clients, materials, offerCount] = await measureAdminAuxQuery(
    "admin/offers",
    () =>
      Promise.all([
        prisma.client.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.material.findMany({
          select: {
            id: true,
            name: true,
            sku: true,
            type: true,
            unit: true,
            costPerUnitCents: true,
          },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
        prisma.offer.count(),
      ]),
    { locale },
  );

  return measureAdminMapping("admin/offers", () => ({
    suggestedNumber: suggestedDocumentNumber("OF", offerCount),
    clients,
    items: materials.map((material) => localizeInventoryItem(material, locale)),
  }));
}

export async function getInvoiceBuilderOptions(locale: Locale) {
  const [clients, materials, invoiceCount] = await measureAdminAuxQuery(
    "admin/invoices",
    () =>
      Promise.all([
        prisma.client.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.material.findMany({
          select: {
            id: true,
            name: true,
            sku: true,
            type: true,
            unit: true,
            costPerUnitCents: true,
          },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
        prisma.invoice.count(),
      ]),
    { locale },
  );

  return measureAdminMapping("admin/invoices", () => ({
    suggestedNumber: suggestedDocumentNumber("INV", invoiceCount),
    clients,
    items: materials.map((material) => localizeInventoryItem(material, locale)),
  }));
}

export async function getPurchaseInvoiceBuilderOptions(
  locale: Locale,
  pageLabel = "admin/purchase-invoices",
) {
  const [suppliers, materials, purchaseInvoiceCount] = await measureAdminAuxQuery(
    pageLabel,
    () =>
      Promise.all([
        prisma.supplier.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.material.findMany({
          select: {
            id: true,
            name: true,
            sku: true,
            type: true,
            unit: true,
            costPerUnitCents: true,
          },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
        prisma.purchaseInvoice.count(),
      ]),
    { locale },
  );

  return measureAdminMapping(pageLabel, () => ({
    suggestedNumber: suggestedDocumentNumber("PINV", purchaseInvoiceCount),
    suppliers,
    items: materials.map((material) => localizeInventoryItem(material, locale)),
  }));
}

export async function getDeliveryNoteBuilderOptions(locale: Locale) {
  const [clients, suppliers, materials, salesCount, purchaseCount] = await measureAdminAuxQuery(
    "admin/delivery-notes",
    () =>
      Promise.all([
        prisma.client.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.supplier.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.material.findMany({
          select: {
            id: true,
            name: true,
            sku: true,
            type: true,
            unit: true,
            costPerUnitCents: true,
          },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
        prisma.deliveryNote.count({ where: { type: DeliveryNoteType.SALES } }),
        prisma.deliveryNote.count({ where: { type: DeliveryNoteType.PURCHASE } }),
      ]),
    { locale },
  );

  return measureAdminMapping("admin/delivery-notes", () => ({
    suggestedNumbers: {
      SALES: suggestedDocumentNumber("SDN", salesCount),
      PURCHASE: suggestedDocumentNumber("PDN", purchaseCount),
    },
    clients,
    suppliers,
    items: materials.map((material) => localizeInventoryItem(material, locale)),
  }));
}

export async function getDebitNoteBuilderOptions() {
  const [clients, invoices, debitNoteCount] = await measureAdminAuxQuery("admin/debit-notes", () =>
    Promise.all([
      prisma.client.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.invoice.findMany({
        include: {
          client: true,
          items: true,
          debitNotes: {
            include: {
              items: true,
            },
          },
        },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.debitNote.count(),
    ]),
  );

  return measureAdminMapping("admin/debit-notes", () => ({
    suggestedNumber: suggestedDocumentNumber("DN", debitNoteCount),
    clients,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      clientId: invoice.clientId,
      issuedAt: invoice.issuedAt.toISOString(),
      totalCents: invoice.totalCents,
      amountPaidCents: invoice.amountPaidCents,
      adjustedOutstandingCents: getAdjustedInvoiceOutstandingCents(invoice),
      items: invoice.items.map((item) => {
        const adjustedQuantity = invoice.debitNotes.reduce(
          (sum, debitNote) =>
            sum +
            debitNote.items
              .filter((debitItem) => debitItem.invoiceItemId === item.id)
              .reduce((inner, debitItem) => inner + debitItem.quantity, 0),
          0,
        );

        return {
          id: item.id,
          name: item.productName,
          description: item.description,
          quantity: item.quantity,
          remainingQuantity: Math.max(item.quantity - adjustedQuantity, 0),
          unitPriceCents: item.unitPriceCents,
        };
      }),
    })),
  }));
}

export async function getProductBuilderOptions() {
  return prisma.material.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

function numberFromDb(value: bigint | number | null | undefined) {
  return typeof value === "bigint" ? Number(value) : (value ?? 0);
}

type DashboardTotals = {
  subtotalCents?: bigint | number | null;
  vatAmountCents?: bigint | number | null;
  totalCents?: bigint | number | null;
};

type DashboardProductRow = {
  name: string;
  quantity?: number | null;
  revenueCents?: bigint | number | null;
};

type DashboardSeriesRow = {
  month: string;
  revenueCents?: bigint | number | null;
  profitCents?: bigint | number | null;
  vatCents?: bigint | number | null;
};

type DashboardMaterialUsageRow = {
  name: string;
  quantity?: number | null;
};

type DashboardLowStockMaterialRow = {
  id: string;
  name: string;
  unit: Material["unit"];
  stockQuantity: number;
  lowStockThreshold: number;
};

type DashboardNotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string | Date;
};

type DashboardOverdueInvoiceRow = {
  id: string;
  number: string;
  client: string;
  dueDate: string | Date;
  totalCents: bigint | number | null;
  outstandingCents: bigint | number | null;
  status: InvoiceStatus;
};

type DashboardMetricsRow = {
  monthlyTotals: DashboardTotals | null;
  monthlyProfitCents: bigint | number | null;
  outstandingDebtCents: bigint | number | null;
  bestSellingProducts: DashboardProductRow[] | null;
  revenueSeries: DashboardSeriesRow[] | null;
  materialUsage: DashboardMaterialUsageRow[] | null;
  lowStockMaterials: DashboardLowStockMaterialRow[] | null;
  notifications: DashboardNotificationRow[] | null;
  overdueInvoices: DashboardOverdueInvoiceRow[] | null;
};

export async function getDashboardSnapshot(locale: Locale) {
  return measureAsync("erp.dashboardSnapshot", async () => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const nextMonthStart = addMonths(currentMonthStart, 1);
    const seriesStart = startOfMonth(subMonths(now, 5));

    const dashboardMetricsRows = await measureAdminMainQuery(
      "admin/dashboard",
      () =>
        prisma.$queryRaw<DashboardMetricsRow[]>`
            WITH monthly_invoices AS (
              SELECT
                COALESCE(SUM("subtotalCents"), 0) AS "subtotalCents",
                COALESCE(SUM("vatAmountCents"), 0) AS "vatAmountCents",
                COALESCE(SUM("totalCents"), 0) AS "totalCents"
              FROM "Invoice"
              WHERE "issuedAt" >= ${currentMonthStart}
                AND "issuedAt" < ${nextMonthStart}
            ),
            monthly_profit AS (
              SELECT COALESCE(SUM(ii."lineTotalCents" - ii."unitCostCents" * ii."quantity"), 0) AS "monthlyProfitCents"
              FROM "InvoiceItem" ii
              INNER JOIN "Invoice" i ON i.id = ii."invoiceId"
              WHERE i."issuedAt" >= ${currentMonthStart}
                AND i."issuedAt" < ${nextMonthStart}
            ),
            outstanding_debt AS (
              SELECT COALESCE(
                SUM(
                  GREATEST(
                    i."totalCents" - i."amountPaidCents" - COALESCE(dn."totalCents", 0),
                    0
                  )
                ),
                0
              ) AS "outstandingDebtCents"
              FROM "Invoice" i
              LEFT JOIN (
                SELECT "invoiceId", SUM("totalCents") AS "totalCents"
                FROM "DebitNote"
                GROUP BY "invoiceId"
              ) dn ON dn."invoiceId" = i.id
              WHERE i."status"::text <> ${InvoiceStatus.PAID}
            ),
            best_selling_products AS (
              SELECT
                ii."productName" AS name,
                COALESCE(SUM(ii."quantity"), 0)::double precision AS quantity,
                COALESCE(SUM(ii."lineTotalCents"), 0) AS "revenueCents"
              FROM "InvoiceItem" ii
              GROUP BY ii."productName"
              ORDER BY quantity DESC
              LIMIT 4
            ),
            invoice_months AS (
              SELECT
                date_trunc('month', "issuedAt") AS month,
                COALESCE(SUM("totalCents"), 0) AS "revenueCents",
                COALESCE(SUM("vatAmountCents"), 0) AS "vatCents"
              FROM "Invoice"
              WHERE "issuedAt" >= ${seriesStart}
                AND "issuedAt" < ${nextMonthStart}
              GROUP BY 1
            ),
            profit_months AS (
              SELECT
                date_trunc('month', i."issuedAt") AS month,
                COALESCE(SUM(ii."lineTotalCents" - ii."unitCostCents" * ii."quantity"), 0) AS "profitCents"
              FROM "InvoiceItem" ii
              INNER JOIN "Invoice" i ON i.id = ii."invoiceId"
              WHERE i."issuedAt" >= ${seriesStart}
                AND i."issuedAt" < ${nextMonthStart}
              GROUP BY 1
            ),
            revenue_series AS (
              SELECT
                to_char(COALESCE(invoice_months.month, profit_months.month), 'YYYY-MM') AS month,
                COALESCE(invoice_months."revenueCents", 0) AS "revenueCents",
                COALESCE(profit_months."profitCents", 0) AS "profitCents",
                COALESCE(invoice_months."vatCents", 0) AS "vatCents"
              FROM invoice_months
              FULL OUTER JOIN profit_months USING (month)
              ORDER BY month ASC
            ),
            material_usage AS (
              SELECT
                m."name",
                COALESCE(SUM(im."quantity"), 0)::double precision AS "quantity"
              FROM "InventoryMovement" im
              INNER JOIN "Material" m ON m.id = im."materialId"
              WHERE im."kind"::text = ${InventoryMovementKind.CONSUMPTION}
              GROUP BY m.id, m."name"
              ORDER BY "quantity" DESC
              LIMIT 5
            ),
            low_stock_materials AS (
              SELECT
                id,
                name,
                unit,
                "stockQuantity",
                "lowStockThreshold"
              FROM "Material"
              WHERE "stockQuantity" <= "lowStockThreshold"
              ORDER BY "stockQuantity" ASC
              LIMIT 6
            ),
            latest_notifications AS (
              SELECT
                id,
                type,
                title,
                message,
                "createdAt"
              FROM "Notification"
              ORDER BY "createdAt" DESC
              LIMIT 6
            ),
            overdue_invoices AS (
              SELECT
                i.id,
                i.number,
                c.name AS client,
                i."dueDate",
                i."totalCents",
                GREATEST(
                  i."totalCents" - i."amountPaidCents" - COALESCE(dn."totalCents", 0),
                  0
                ) AS "outstandingCents",
                i.status
              FROM "Invoice" i
              INNER JOIN "Client" c ON c.id = i."clientId"
              LEFT JOIN (
                SELECT "invoiceId", SUM("totalCents") AS "totalCents"
                FROM "DebitNote"
                GROUP BY "invoiceId"
              ) dn ON dn."invoiceId" = i.id
              WHERE i."status"::text <> ${InvoiceStatus.PAID}
                AND (i."dueDate" < ${now} OR i."status"::text = ${InvoiceStatus.OVERDUE})
              ORDER BY i."dueDate" ASC, i."issuedAt" DESC
              LIMIT 5
            )
            SELECT
              (SELECT row_to_json(monthly_invoices) FROM monthly_invoices) AS "monthlyTotals",
              (SELECT "monthlyProfitCents" FROM monthly_profit) AS "monthlyProfitCents",
              (SELECT "outstandingDebtCents" FROM outstanding_debt) AS "outstandingDebtCents",
              COALESCE((SELECT json_agg(row_to_json(best_selling_products)) FROM best_selling_products), '[]'::json) AS "bestSellingProducts",
              COALESCE((SELECT json_agg(row_to_json(revenue_series)) FROM revenue_series), '[]'::json) AS "revenueSeries",
              COALESCE((SELECT json_agg(row_to_json(material_usage)) FROM material_usage), '[]'::json) AS "materialUsage",
              COALESCE((SELECT json_agg(row_to_json(low_stock_materials)) FROM low_stock_materials), '[]'::json) AS "lowStockMaterials",
              COALESCE((SELECT json_agg(row_to_json(latest_notifications)) FROM latest_notifications), '[]'::json) AS "notifications",
              COALESCE((SELECT json_agg(row_to_json(overdue_invoices)) FROM overdue_invoices), '[]'::json) AS "overdueInvoices"
          `,
      { locale },
    );

    const dashboardMetrics = dashboardMetricsRows[0];
    const monthlyInvoiceTotals = dashboardMetrics?.monthlyTotals;
    const bestSellingProductRows = dashboardMetrics?.bestSellingProducts ?? [];
    const revenueSeriesRows = dashboardMetrics?.revenueSeries ?? [];
    const materialUsageRows = dashboardMetrics?.materialUsage ?? [];
    const lowStockMaterials = dashboardMetrics?.lowStockMaterials ?? [];
    const notifications = dashboardMetrics?.notifications ?? [];
    const overdueInvoiceRows = dashboardMetrics?.overdueInvoices ?? [];
    const monthlyRevenueCents = numberFromDb(monthlyInvoiceTotals?.totalCents);
    const monthlyRevenueBeforeVatCents =
      numberFromDb(monthlyInvoiceTotals?.subtotalCents);
    const monthlyVatCents = numberFromDb(monthlyInvoiceTotals?.vatAmountCents);
    const monthlyProfitCents = numberFromDb(dashboardMetrics?.monthlyProfitCents);
    const outstandingDebtCents = numberFromDb(dashboardMetrics?.outstandingDebtCents);

    const bestSellingProducts = bestSellingProductRows.map((product) => ({
      name: product.name,
      quantity: product.quantity ?? 0,
      revenueCents: numberFromDb(product.revenueCents),
    }));

    const revenueSeriesByMonth = new Map(
      revenueSeriesRows.map((row) => [
        row.month,
        {
          revenueCents: numberFromDb(row.revenueCents),
          profitCents: numberFromDb(row.profitCents),
          vatCents: numberFromDb(row.vatCents),
        },
      ]),
    );

    const revenueSeries = Array.from({ length: 6 }, (_, index) => {
      const month = subMonths(now, 5 - index);
      const row = revenueSeriesByMonth.get(format(month, "yyyy-MM"));

      return {
        month: format(month, "MMM"),
        revenue: (row?.revenueCents ?? 0) / 100,
        profit: (row?.profitCents ?? 0) / 100,
        vat: (row?.vatCents ?? 0) / 100,
      };
    });

    const materialUsage = materialUsageRows.map((movement) => ({
      name: movement.name,
      quantity: movement.quantity ?? 0,
    }));

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
      overdueInvoices: overdueInvoiceRows.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        client: invoice.client,
        dueDate: invoice.dueDate,
        totalCents: numberFromDb(invoice.totalCents),
        outstandingCents: numberFromDb(invoice.outstandingCents),
        status: invoice.status,
      })),
    };
  }, { locale });
}

export async function getReportsSnapshot(locale: Locale) {
  return measureAsync("erp.reportsSnapshot", async () => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const nextMonthStart = addMonths(currentMonthStart, 1);
    const seriesStart = startOfMonth(subMonths(now, 5));

    const [
      profitByProductRows,
      materialUsageRows,
      clientDebtRows,
      products,
      expensesByMonthRows,
      expenseCategoryRows,
      debitNoteTotal,
      debitNotesByClientRows,
      deliveryNoteStatusGroups,
    ] = await measureAdminMainQuery(
      "admin/reports",
      () =>
        Promise.all([
          prisma.$queryRaw<
            Array<{
              name: string;
              profitCents: bigint | number | null;
              quantity: number | null;
            }>
          >`
            SELECT
              ii."productName" AS name,
              COALESCE(SUM(ii."lineTotalCents" - ii."unitCostCents" * ii."quantity"), 0) AS "profitCents",
              COALESCE(SUM(ii."quantity"), 0)::double precision AS quantity
            FROM "InvoiceItem" ii
            GROUP BY ii."productName"
            ORDER BY "profitCents" DESC
            LIMIT 50
          `,
          prisma.$queryRaw<Array<{ name: string; quantity: number | null }>>`
            SELECT
              m."name",
              COALESCE(SUM(im."quantity"), 0)::double precision AS "quantity"
            FROM "InventoryMovement" im
            INNER JOIN "Material" m ON m.id = im."materialId"
            WHERE im."kind"::text = ${InventoryMovementKind.CONSUMPTION}
            GROUP BY m.id, m."name"
            ORDER BY "quantity" DESC
            LIMIT 50
          `,
          prisma.$queryRaw<
            Array<{ id: string; name: string; outstandingDebtCents: bigint | number | null }>
          >`
            SELECT
              c.id,
              c."name",
              COALESCE(
                SUM(
                  GREATEST(
                    i."totalCents" - i."amountPaidCents" - COALESCE(dn."totalCents", 0),
                    0
                  )
                ),
                0
              ) AS "outstandingDebtCents"
            FROM "Client" c
            INNER JOIN "Invoice" i ON i."clientId" = c.id
            LEFT JOIN (
              SELECT "invoiceId", SUM("totalCents") AS "totalCents"
              FROM "DebitNote"
              GROUP BY "invoiceId"
            ) dn ON dn."invoiceId" = i.id
            WHERE c."deletedAt" IS NULL
              AND i."status"::text <> ${InvoiceStatus.PAID}
            GROUP BY c.id, c."name"
            HAVING COALESCE(
              SUM(
                GREATEST(
                  i."totalCents" - i."amountPaidCents" - COALESCE(dn."totalCents", 0),
                  0
                )
              ),
              0
            ) > 0
            ORDER BY "outstandingDebtCents" DESC
            LIMIT 50
          `,
          getProductOverview(locale),
          prisma.$queryRaw<Array<{ month: Date; totalCents: bigint | number | null }>>`
            SELECT
              date_trunc('month', "date") AS month,
              COALESCE(SUM("totalCents"), 0) AS "totalCents"
            FROM "Expense"
            WHERE "date" >= ${seriesStart}
              AND "date" < ${nextMonthStart}
            GROUP BY 1
            ORDER BY 1 ASC
          `,
          prisma.expense.groupBy({
            by: ["category"],
            _sum: { totalCents: true },
            _count: { _all: true },
            orderBy: { _sum: { totalCents: "desc" } },
          }),
          prisma.debitNote.aggregate({
            _sum: { totalCents: true },
          }),
          prisma.$queryRaw<
            Array<{
              id: string;
              name: string;
              totalCents: bigint | number | null;
              count: bigint | number | null;
            }>
          >`
            SELECT
              c.id,
              c."name",
              COALESCE(SUM(dn."totalCents"), 0) AS "totalCents",
              COUNT(*) AS count
            FROM "DebitNote" dn
            INNER JOIN "Client" c ON c.id = dn."clientId"
            GROUP BY c.id, c."name"
            ORDER BY "totalCents" DESC
            LIMIT 50
          `,
          prisma.deliveryNote.groupBy({
            by: ["status"],
            _count: { _all: true },
          }),
        ]),
      { locale },
    );

    const expensesByMonthMap = new Map(
      expensesByMonthRows.map((row) => [
        format(row.month, "yyyy-MM"),
        numberFromDb(row.totalCents),
      ]),
    );
    const expensesByMonth = Array.from({ length: 6 }, (_, index) => {
      const month = subMonths(now, 5 - index);

      return {
        month: format(month, "MMM"),
        totalCents: expensesByMonthMap.get(format(month, "yyyy-MM")) ?? 0,
      };
    });
    const deliveryNoteCountByStatus = new Map(
      deliveryNoteStatusGroups.map((group) => [group.status, group._count._all]),
    );
    const deliveryNoteCounts = {
      total: Array.from(deliveryNoteCountByStatus.values()).reduce((sum, count) => sum + count, 0),
      delivered: deliveryNoteCountByStatus.get(DeliveryNoteStatus.DELIVERED) ?? 0,
      cancelled: deliveryNoteCountByStatus.get(DeliveryNoteStatus.CANCELLED) ?? 0,
      draft: deliveryNoteCountByStatus.get(DeliveryNoteStatus.DRAFT) ?? 0,
    };

    return {
      productMargins: products.map((product) => ({
        name: product.name,
        marginCents: product.estimatedProfitCents,
        priceCents: product.basePriceCents,
        costCents: product.unitCostCents,
      })),
      profitByProduct: profitByProductRows.map((product) => ({
        name: product.name,
        profitCents: numberFromDb(product.profitCents),
        quantity: product.quantity ?? 0,
      })),
      materialUsage: materialUsageRows.map((material) => ({
        name: material.name,
        quantity: material.quantity ?? 0,
      })),
      clientDebt: clientDebtRows.map((client) => ({
        id: client.id,
        name: client.name,
        outstandingDebtCents: numberFromDb(client.outstandingDebtCents),
      })),
      expensesByMonth,
      expensesByCategory: expenseCategoryRows.map((category) => ({
        category: category.category,
        totalCents: category._sum.totalCents ?? 0,
        count: category._count._all,
      })),
      debitNoteTotalCents: debitNoteTotal._sum.totalCents ?? 0,
      debitNotesByClient: debitNotesByClientRows.map((client) => ({
        id: client.id,
        name: client.name,
        totalCents: numberFromDb(client.totalCents),
        count: numberFromDb(client.count),
      })),
      deliveryNoteCounts,
    };
  }, { locale });
}

export function statusTone(status: string) {
  if (
    status === OfferStatus.ACCEPTED ||
    status === InvoiceStatus.PAID ||
    status === DeliveryNoteStatus.DELIVERED
  ) {
    return "success" as const;
  }
  if (
    status === OfferStatus.REJECTED ||
    status === InvoiceStatus.OVERDUE ||
    status === DeliveryNoteStatus.CANCELLED
  ) {
    return "danger" as const;
  }
  if (status === InvoiceStatus.PARTIAL || status === DeliveryNoteStatus.DRAFT) {
    return "warning" as const;
  }

  return "accent" as const;
}

export function materialTypeLabel(type: MaterialType, locale: Locale) {
  const labels: Record<MaterialType, [string, string]> = {
    WOOD: ["Dru", "Wood"],
    HARDWARE: ["Pajisje / Aksesorë", "Hardware"],
    COMPONENT: ["Komponent", "Component"],
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

export async function getPurchaseInvoiceDocumentData(id: string) {
  return prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: true,
    },
  });
}

export async function getExpenseDocumentData(id: string) {
  return prisma.expense.findUnique({
    where: { id },
  });
}

export async function getDeliveryNoteDocumentData(id: string) {
  return prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      client: true,
      supplier: true,
      items: true,
    },
  });
}

export async function getDebitNoteDocumentData(id: string) {
  return prisma.debitNote.findUnique({
    where: { id },
    include: {
      client: true,
      invoice: true,
      items: true,
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
