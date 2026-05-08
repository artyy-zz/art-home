import { withPagePerf } from "@/lib/perf";
import Link from "next/link";
import { createInvoiceAction } from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { InvoiceActions } from "@/components/admin/invoice-actions";
import { RecordTable } from "@/components/admin/record-table";
import { InvoiceBuilderForm } from "@/components/forms/invoice-builder-form";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import {
  getAdjustedInvoiceOutstandingCents,
  getInvoiceAdjustmentCents,
  getInvoiceBuilderOptions,
  getInvoiceOverviewPage,
  statusTone,
} from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabels = {
  sq: {
    UNPAID: "E papaguar",
    PARTIAL: "Pjeserisht",
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

async function InvoicesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/invoices">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "INVOICES", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "issuedAt";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const [invoices, options] = await Promise.all([
    getInvoiceOverviewPage({
      page: parsePage(resolvedSearchParams.page),
      query,
      sort,
      direction,
    }),
    getInvoiceBuilderOptions(typedLocale),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "INVOICES", "CREATE");
  const canEdit = can(permissions, "INVOICES", "EDIT");
  const canDelete = can(permissions, "INVOICES", "DELETE");
  const canExport = can(permissions, "INVOICES", "EXPORT");
  const canCreateInvoice = canCreate && options.clients.length > 0 && options.items.length > 0;
  const missingSetupHref =
    options.clients.length === 0
      ? `/${typedLocale}/admin/clients`
      : `/${typedLocale}/admin/inventory`;
  const missingSetupLabel =
    options.clients.length === 0
      ? typedLocale === "sq"
        ? "Shto klient"
        : "Add client"
      : typedLocale === "sq"
        ? "Shto artikull"
        : "Add item";
  const missingSetupMessage =
    options.clients.length === 0
      ? typedLocale === "sq"
        ? "Shtoni nje klient para se te krijoni faturen e pare."
        : "Add a client before creating the first invoice."
      : typedLocale === "sq"
        ? "Shtoni nje artikull para se te krijoni faturen e pare."
        : "Add an item before creating the first invoice.";

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Krijo fature shitjeje" : "Create sales invoice"}
          buttonLabel={typedLocale === "sq" ? "Shto fature" : "Add invoice"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          {canCreateInvoice ? (
            <div>
              <InvoiceBuilderForm
                locale={typedLocale}
                clients={options.clients.map((client) => ({
                  id: client.id,
                  name: client.name,
                }))}
                items={options.items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  unit: item.unit,
                  unitPriceCents: item.unitPriceCents,
                  categoryTitle: item.categoryTitle,
                }))}
                action={createInvoiceAction.bind(null, typedLocale)}
              />
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border-[2.25px] border-black/18 bg-white/75 p-5">
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                {missingSetupMessage}
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
          currentPath={`/${typedLocale}/admin/invoices`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq"
              ? "Kerko fatura shitjeje, kliente ose artikuj"
              : "Search sales invoices, clients, or items"
          }
          searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka fatura shitjeje per kete kerkim."
              : "No sales invoices match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          serverControlled
          pagination={{
            page: invoices.page,
            totalPages: invoices.totalPages,
            totalItems: invoices.totalItems,
            pageSize: invoices.pageSize,
            label:
              typedLocale === "sq"
                ? "Faqja {page} nga {totalPages} - {totalItems} fatura"
                : "Page {page} of {totalPages} - {totalItems} invoices",
            previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
            nextLabel: typedLocale === "sq" ? "Para" : "Next",
          }}
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Fatura e shitjes" : "Sales invoice", sortable: true },
            { key: "client", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
            { key: "items", label: typedLocale === "sq" ? "Artikujt" : "Items" },
            { key: "notes", label: typedLocale === "sq" ? "Shenime" : "Notes" },
            { key: "dueDate", label: typedLocale === "sq" ? "Afati" : "Due date", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Totali / Borxhi" : "Total / Debt", sortable: true, align: "right" },
          ]}
          rows={invoices.items.map((invoice) => {
            const adjustmentCents = getInvoiceAdjustmentCents(invoice);
            const outstandingCents = getAdjustedInvoiceOutstandingCents(invoice);

            return {
              id: invoice.id,
              searchText: `${invoice.number} ${invoice.client.name} ${invoice.status} ${invoice.notes ?? ""} ${invoice.items.map((item) => item.productName).join(" ")}`,
              sortValues: {
                number: invoice.number,
                client: invoice.client.name,
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
                client: invoice.client.name,
                status: <Badge tone={statusTone(invoice.status)}>{statusLabels[typedLocale][invoice.status]}</Badge>,
                items: (
                  <div className="space-y-1 text-sm text-[var(--color-muted)]">
                    {invoice.items.map((item) => (
                      <p key={item.id}>
                        {item.productName}: {item.quantity} x {formatCurrency(item.unitPriceCents, localeString)}
                      </p>
                    ))}
                  </div>
                ),
                notes: (
                  <p className="max-w-[240px] whitespace-pre-wrap text-[var(--color-muted)]">
                    {invoice.notes || "-"}
                  </p>
                ),
                dueDate: formatDate(invoice.dueDate, localeString),
                total: (
                  <div className="space-y-1">
                    <p className="font-semibold">{formatCurrency(invoice.totalCents, localeString)}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Paguar" : "Paid"}:{" "}
                      {formatCurrency(invoice.amountPaidCents, localeString)}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Debit Note: {formatCurrency(adjustmentCents, localeString)}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Borxh" : "Debt"}:{" "}
                      {formatCurrency(outstandingCents, localeString)}
                    </p>
                  </div>
                ),
              },
              actions: (
                <InvoiceActions
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
  );
}

export default withPagePerf("admin/invoices", InvoicesPage);
