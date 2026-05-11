import { withPagePerf } from "@/lib/perf";
import {
  createPurchaseInvoiceAction,
} from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { LazyPurchaseInvoiceBuilderForm } from "@/components/admin/lazy-admin-options";
import { PurchaseInvoiceActions } from "@/components/admin/purchase-invoice-actions";
import { RecordTable } from "@/components/admin/record-table";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import {
  getPurchaseInvoiceOverviewPage,
  statusTone,
} from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabels = {
  sq: {
    UNPAID: "E papaguar",
    PARTIAL: "Pjesërisht",
    PAID: "E paguar",
    OVERDUE: "E vonuar",
  },
  en: {
    UNPAID: "Unpaid",
    PARTIAL: "Partial",
    PAID: "Paid",
    OVERDUE: "Overdue",
  },
} as const;

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function PurchaseInvoicesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/purchase-invoices">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "PURCHASE_INVOICES", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "issuedAt";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const canCreate = can(permissions, "PURCHASE_INVOICES", "CREATE");
  const purchaseInvoices = await getPurchaseInvoiceOverviewPage({
    page: parsePage(resolvedSearchParams.page),
    query,
    sort,
    direction,
  });
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canEdit = can(permissions, "PURCHASE_INVOICES", "EDIT");
  const canDelete = can(permissions, "PURCHASE_INVOICES", "DELETE");
  const canExport = can(permissions, "PURCHASE_INVOICES", "EXPORT");

  return measureDetailSync(
    "admin/purchase-invoices.table mapping/formatting",
    () => (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Krijo faturë blerjeje" : "Create purchase invoice"}
          buttonLabel={typedLocale === "sq" ? "Shto faturë blerjeje" : "Add purchase invoice"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <LazyPurchaseInvoiceBuilderForm
            locale={typedLocale}
            action={createPurchaseInvoiceAction.bind(null, typedLocale)}
          />
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/purchase-invoices`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq"
              ? "Kërko fatura blerjeje, furnitorë ose artikuj"
              : "Search purchase invoices, suppliers, or items"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka fatura blerjeje për këtë kërkim."
              : "No purchase invoices match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          serverControlled
          pagination={{
            page: purchaseInvoices.page,
            totalPages: purchaseInvoices.totalPages,
            totalItems: purchaseInvoices.totalItems,
            pageSize: purchaseInvoices.pageSize,
            hasNextPage: purchaseInvoices.hasNextPage,
            hasPreviousPage: purchaseInvoices.hasPreviousPage,
            exactTotal: purchaseInvoices.exactTotal,
            label:
              typedLocale === "sq"
                ? "Faqja {page} nga {totalPages} - {totalItems} fatura blerjeje"
                : "Page {page} of {totalPages} - {totalItems} purchase invoices",
            previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
            nextLabel: typedLocale === "sq" ? "Para" : "Next",
          }}
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Fatura e blerjes" : "Purchase invoice", sortable: true },
            { key: "supplier", label: typedLocale === "sq" ? "Furnitori" : "Supplier", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
            { key: "dueDate", label: typedLocale === "sq" ? "Afati" : "Due date", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Totali / Borxhi" : "Total / Debt", sortable: true, align: "right" },
            { key: "description", label: typedLocale === "sq" ? "Përshkrimi" : "Description" },
          ]}
          rows={purchaseInvoices.items.map((invoice) => {
            const outstandingCents = invoice.totalCents - invoice.amountPaidCents;

            return {
              id: invoice.id,
              searchText: `${invoice.number} ${invoice.supplier.name} ${invoice.status} ${invoice.notes ?? ""} ${invoice.items.map((item) => item.productName).join(" ")}`,
              sortValues: {
                number: invoice.number,
                supplier: invoice.supplier.name,
                status: invoice.status,
                dueDate: invoice.dueDate,
                total: invoice.totalCents,
                issuedAt: invoice.issuedAt,
              },
              cells: {
                number: (
                  <div>
                    <p className="font-semibold">{invoice.number}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {formatDate(invoice.issuedAt, localeString)}
                    </p>
                  </div>
                ),
                supplier: invoice.supplier.name,
                status: <Badge tone={statusTone(invoice.status)}>{statusLabels[typedLocale][invoice.status]}</Badge>,
                dueDate: formatDate(invoice.dueDate, localeString),
                total: (
                  <div className="space-y-1">
                    <p className="font-semibold">{formatCurrency(invoice.totalCents, localeString)}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Paguar" : "Paid"}:{" "}
                      {formatCurrency(invoice.amountPaidCents, localeString)}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Borxh" : "Debt"}:{" "}
                      {formatCurrency(outstandingCents, localeString)}
                    </p>
                  </div>
                ),
                description: (
                  <div className="max-w-[260px] space-y-1 text-sm text-[var(--color-muted)]">
                    {invoice.items.map((item) => (
                      <p key={item.id}>
                        {item.productName}: {item.quantity} x {formatCurrency(item.unitPriceCents, localeString)}
                      </p>
                    ))}
                    {invoice.notes ? (
                      <p className="whitespace-pre-wrap pt-1">{invoice.notes}</p>
                    ) : null}
                  </div>
                ),
              },
              actions: (
                <PurchaseInvoiceActions
                  locale={typedLocale}
                  invoice={{
                    id: invoice.id,
                    number: invoice.number,
                    status: invoice.status,
                    dueDate: invoice.dueDate,
                    amountPaidCents: invoice.amountPaidCents,
                    vatEnabled: invoice.vatEnabled,
                    notes: invoice.notes,
                  }}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canExport={canExport}
                />
              ),
            };
          })}
        />
      </Card>
    </div>
    ),
    { locale: typedLocale, rows: purchaseInvoices.items.length },
  );
}

export default withPagePerf("admin/purchase-invoices", PurchaseInvoicesPage);
