import { withPagePerf } from "@/lib/perf";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  createPurchaseInvoiceAction,
  deletePurchaseInvoiceAction,
  updatePurchaseInvoiceAction,
} from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
import { PurchaseInvoiceBuilderForm } from "@/components/forms/purchase-invoice-builder-form";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import {
  getPurchaseInvoiceBuilderOptions,
  getPurchaseInvoiceOverviewPage,
  statusTone,
} from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateInputValue } from "@/lib/utils";

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

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

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
  const [purchaseInvoices, options] = await Promise.all([
    getPurchaseInvoiceOverviewPage({
      page: parsePage(resolvedSearchParams.page),
      query,
      sort,
      direction,
    }),
    canCreate
      ? getPurchaseInvoiceBuilderOptions(typedLocale)
      : Promise.resolve({ suppliers: [], items: [] }),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canEdit = can(permissions, "PURCHASE_INVOICES", "EDIT");
  const canDelete = can(permissions, "PURCHASE_INVOICES", "DELETE");
  const canExport = can(permissions, "PURCHASE_INVOICES", "EXPORT");
  const canCreatePurchaseInvoice =
    canCreate && options.suppliers.length > 0 && options.items.length > 0;
  const missingSetupHref =
    options.suppliers.length === 0
      ? `/${typedLocale}/admin/suppliers`
      : `/${typedLocale}/admin/inventory`;
  const missingSetupLabel =
    options.suppliers.length === 0
      ? typedLocale === "sq"
        ? "Shto furnitor"
        : "Add supplier"
      : typedLocale === "sq"
        ? "Shko te artikujt"
        : "Go to items";

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
          {canCreatePurchaseInvoice ? (
            <div>
              <PurchaseInvoiceBuilderForm
                locale={typedLocale}
                suppliers={options.suppliers.map((supplier) => ({
                  id: supplier.id,
                  name: supplier.name,
                }))}
                items={options.items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  unit: item.unit,
                  unitPriceCents: item.unitPriceCents,
                  categoryTitle: item.categoryTitle,
                }))}
                action={createPurchaseInvoiceAction.bind(null, typedLocale)}
              />
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border-[2.25px] border-black/18 bg-white/75 p-5">
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                {typedLocale === "sq"
                  ? "Shtoni furnitor dhe artikull në inventar para se të krijoni faturën e parë të blerjes."
                  : "Add a supplier and an inventory item before creating the first purchase invoice."}
              </p>
              <Link
                href={missingSetupHref}
                className={buttonClasses({ variant: "secondary" })}
              >
                {missingSetupLabel}
              </Link>
            </div>
          )}
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
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
                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                  {canExport ? (
                    <Link
                      href={`/api/purchase-invoices/${invoice.id}/pdf`}
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      PDF
                    </Link>
                  ) : null}
                  {canEdit ? (
                    <details className="relative text-left">
                      <summary className={buttonClasses({ variant: "secondary", size: "sm", className: "inline-flex cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden" })}>
                        <Pencil className="h-4 w-4" />
                        {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                      </summary>
                      <form
                        action={updatePurchaseInvoiceAction.bind(null, typedLocale, invoice.id)}
                        className="absolute right-0 z-20 mt-2 grid w-[min(90vw,380px)] gap-2 rounded-2xl border-[2.25px] border-black/18 bg-[#fbf8f4] p-3 shadow-[0_18px_48px_rgba(18,16,14,0.16)]"
                      >
                        <select name="status" defaultValue={invoice.status} className={inputClassName}>
                          <option value="UNPAID">{statusLabels[typedLocale].UNPAID}</option>
                          <option value="PARTIAL">{statusLabels[typedLocale].PARTIAL}</option>
                          <option value="PAID">{statusLabels[typedLocale].PAID}</option>
                          <option value="OVERDUE">{statusLabels[typedLocale].OVERDUE}</option>
                        </select>
                        <input
                          name="dueDate"
                          type="date"
                          defaultValue={formatDateInputValue(invoice.dueDate)}
                          className={inputClassName}
                        />
                        <input
                          name="amountPaid"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={invoice.amountPaidCents / 100}
                          className={inputClassName}
                          placeholder={typedLocale === "sq" ? "Paguar EUR" : "Paid EUR"}
                        />
                        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-muted)]">
                          <input type="checkbox" name="vatEnabled" defaultChecked={invoice.vatEnabled} className="h-4 w-4" />
                          {typedLocale === "sq" ? "Apliko TVSH" : "Apply VAT"} (18%)
                        </label>
                        <textarea name="notes" defaultValue={invoice.notes ?? ""} className={inputClassName} />
                        <button className={buttonClasses({ size: "sm" })}>
                          {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                  {canDelete ? (
                    <form action={deletePurchaseInvoiceAction.bind(null, typedLocale, invoice.id)}>
                      <ConfirmDeleteButton
                        label={typedLocale === "sq" ? "Fshi" : "Delete"}
                        message={
                          typedLocale === "sq"
                            ? `A je i sigurt qe deshiron ta fshish faturen "${invoice.number}"?`
                            : `Are you sure you want to delete invoice "${invoice.number}"?`
                        }
                      />
                    </form>
                  ) : null}
                </div>
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
