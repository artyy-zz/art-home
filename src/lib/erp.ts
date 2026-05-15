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
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
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

type OfferOverview = Awaited<ReturnType<typeof getOfferOverview>>[number];

export async function getOfferOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "createdAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<OfferOverview>> {
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
      include: {
        client: true,
        lead: true,
        invoice: true,
        items: true,
      },
      orderBy,
      ...paginationSliceArgs(page, pageSize),
    }),
  );

  return paginatedSliceResult({ items, page, pageSize });
}

type InvoiceOverview = Awaited<ReturnType<typeof getInvoiceOverview>>[number];

export async function getInvoiceOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "issuedAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<InvoiceOverview>> {
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
      include: {
        client: true,
        offer: true,
        items: true,
        debitNotes: true,
      },
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
      include: {
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

type DebitNoteOverview = Awaited<ReturnType<typeof getDebitNoteOverview>>[number];

export async function getDebitNoteOverviewPage({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  sort = "issuedAt",
  direction = "desc",
}: ListQuery): Promise<PaginatedResult<DebitNoteOverview>> {
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

export async function getDashboardSnapshot(locale: Locale) {
  return measureAsync("erp.dashboardSnapshot", async () => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const nextMonthStart = addMonths(currentMonthStart, 1);
    const seriesStart = startOfMonth(subMonths(now, 5));

    const [
      monthlyInvoiceTotals,
      monthlyProfitRows,
      outstandingDebtRows,
      bestSellingProductGroups,
      revenueSeriesRows,
      materialUsageRows,
      lowStockMaterials,
      notifications,
      overdueInvoices,
    ] = await measureAdminMainQuery(
      "admin/dashboard",
      () =>
        Promise.all([
          prisma.invoice.aggregate({
            where: {
              issuedAt: {
                gte: currentMonthStart,
                lt: nextMonthStart,
              },
            },
            _sum: {
              subtotalCents: true,
              vatAmountCents: true,
              totalCents: true,
            },
          }),
          prisma.$queryRaw<Array<{ monthlyProfitCents: bigint | number | null }>>`
            SELECT COALESCE(SUM(ii."lineTotalCents" - ii."unitCostCents" * ii."quantity"), 0) AS "monthlyProfitCents"
            FROM "InvoiceItem" ii
            INNER JOIN "Invoice" i ON i.id = ii."invoiceId"
            WHERE i."issuedAt" >= ${currentMonthStart}
              AND i."issuedAt" < ${nextMonthStart}
          `,
          prisma.$queryRaw<Array<{ outstandingDebtCents: bigint | number | null }>>`
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
          `,
          prisma.invoiceItem.groupBy({
            by: ["productName"],
            _sum: {
              quantity: true,
              lineTotalCents: true,
            },
            orderBy: {
              _sum: {
                quantity: "desc",
              },
            },
            take: 4,
          }),
          prisma.$queryRaw<
            Array<{
              month: Date;
              revenueCents: bigint | number | null;
              profitCents: bigint | number | null;
              vatCents: bigint | number | null;
            }>
          >`
            WITH invoice_months AS (
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
            )
            SELECT
              COALESCE(invoice_months.month, profit_months.month) AS month,
              COALESCE(invoice_months."revenueCents", 0) AS "revenueCents",
              COALESCE(profit_months."profitCents", 0) AS "profitCents",
              COALESCE(invoice_months."vatCents", 0) AS "vatCents"
            FROM invoice_months
            FULL OUTER JOIN profit_months USING (month)
            ORDER BY month ASC
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
            LIMIT 5
          `,
          prisma.material.findMany({
            where: {
              stockQuantity: {
                lte: prisma.material.fields.lowStockThreshold,
              },
            },
            select: {
              id: true,
              name: true,
              unit: true,
              stockQuantity: true,
              lowStockThreshold: true,
            },
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
          prisma.invoice.findMany({
            where: {
              status: {
                not: InvoiceStatus.PAID,
              },
              OR: [
                { dueDate: { lt: now } },
                { status: InvoiceStatus.OVERDUE },
              ],
            },
            select: {
              id: true,
              number: true,
              status: true,
              totalCents: true,
              amountPaidCents: true,
              dueDate: true,
              client: {
                select: {
                  name: true,
                },
              },
              debitNotes: {
                select: {
                  totalCents: true,
                },
              },
            },
            orderBy: [{ dueDate: "asc" }, { issuedAt: "desc" }],
            take: 5,
          }),
        ]),
      { locale },
    );

    const monthlyRevenueCents = monthlyInvoiceTotals._sum.totalCents ?? 0;
    const monthlyRevenueBeforeVatCents =
      monthlyInvoiceTotals._sum.subtotalCents ?? 0;
    const monthlyVatCents = monthlyInvoiceTotals._sum.vatAmountCents ?? 0;
    const monthlyProfitCents = numberFromDb(
      monthlyProfitRows[0]?.monthlyProfitCents,
    );
    const outstandingDebtCents = numberFromDb(
      outstandingDebtRows[0]?.outstandingDebtCents,
    );

    const bestSellingProducts = bestSellingProductGroups.map((product) => ({
      name: product.productName,
      quantity: product._sum.quantity ?? 0,
      revenueCents: product._sum.lineTotalCents ?? 0,
    }));

    const revenueSeriesByMonth = new Map(
      revenueSeriesRows.map((row) => [
        format(row.month, "yyyy-MM"),
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
      overdueInvoices: overdueInvoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        client: invoice.client.name,
        dueDate: invoice.dueDate,
        totalCents: invoice.totalCents,
        outstandingCents: getAdjustedInvoiceOutstandingCents(invoice),
        status: invoice.status,
      })),
    };
  }, { locale });
}

export async function getReportsSnapshot(locale: Locale) {
  return measureAsync("erp.reportsSnapshot", async () => {
  const [
    invoices,
    materials,
    clients,
    products,
    expenses,
    debitNotes,
    deliveryNotes,
  ] = await measureAdminMainQuery(
    "admin/reports",
    () =>
      Promise.all([
        prisma.invoice.findMany({
          select: {
            items: {
              select: {
                productName: true,
                quantity: true,
                lineTotalCents: true,
                unitCostCents: true,
              },
            },
          },
          orderBy: { issuedAt: "desc" },
          take: 500,
        }),
        prisma.inventoryMovement.findMany({
          where: {
            kind: InventoryMovementKind.CONSUMPTION,
          },
          select: {
            quantity: true,
            material: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
        getClientOverview(),
        getProductOverview(locale),
        prisma.expense.findMany({
          orderBy: { date: "desc" },
        }),
        prisma.debitNote.findMany({
          select: {
            clientId: true,
            totalCents: true,
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { issuedAt: "desc" },
          take: 500,
        }),
        prisma.deliveryNote.findMany({
          select: {
            status: true,
          },
          orderBy: { issuedAt: "desc" },
        }),
      ]),
    { locale },
  );

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

  const expenseByCategoryMap = new Map<
    string,
    { category: string; totalCents: number; count: number }
  >();
  for (const expense of expenses) {
    const current = expenseByCategoryMap.get(expense.category) ?? {
      category: expense.category,
      totalCents: 0,
      count: 0,
    };

    current.totalCents += expense.totalCents;
    current.count += 1;
    expenseByCategoryMap.set(expense.category, current);
  }

  const expensesByMonth = Array.from({ length: 6 }, (_, index) => {
    const month = subMonths(new Date(), 5 - index);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const monthExpenses = expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date >= start && date <= end;
    });

    return {
      month: format(month, "MMM"),
      totalCents: monthExpenses.reduce(
        (sum, expense) => sum + expense.totalCents,
        0,
      ),
    };
  });

  const debitNotesByClientMap = new Map<
    string,
    { id: string; name: string; totalCents: number; count: number }
  >();
  for (const debitNote of debitNotes) {
    const current = debitNotesByClientMap.get(debitNote.clientId) ?? {
      id: debitNote.clientId,
      name: debitNote.client.name,
      totalCents: 0,
      count: 0,
    };

    current.totalCents += debitNote.totalCents;
    current.count += 1;
    debitNotesByClientMap.set(debitNote.clientId, current);
  }

  const deliveryNoteCounts = {
    total: deliveryNotes.length,
    delivered: deliveryNotes.filter(
      (deliveryNote) => deliveryNote.status === DeliveryNoteStatus.DELIVERED,
    ).length,
    cancelled: deliveryNotes.filter(
      (deliveryNote) => deliveryNote.status === DeliveryNoteStatus.CANCELLED,
    ).length,
    draft: deliveryNotes.filter(
      (deliveryNote) => deliveryNote.status === DeliveryNoteStatus.DRAFT,
    ).length,
  };

  return {
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
    expensesByMonth,
    expensesByCategory: Array.from(expenseByCategoryMap.values()).sort(
      (left, right) => right.totalCents - left.totalCents,
    ),
    debitNoteTotalCents: debitNotes.reduce(
      (sum, debitNote) => sum + debitNote.totalCents,
      0,
    ),
    debitNotesByClient: Array.from(debitNotesByClientMap.values()).sort(
      (left, right) => right.totalCents - left.totalCents,
    ),
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
