import Link from "next/link";
import { createInvoiceAction, deleteInvoiceAction, updateInvoiceAction } from "@/actions/admin";
import { RecordTable } from "@/components/admin/record-table";
import { InvoiceBuilderForm } from "@/components/forms/invoice-builder-form";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { getInvoiceBuilderOptions, getInvoiceOverview, statusTone } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
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

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function InvoicesPage({
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
    getInvoiceOverview(),
    getInvoiceBuilderOptions(typedLocale),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "INVOICES", "CREATE");
  const canEdit = can(permissions, "INVOICES", "EDIT");
  const canDelete = can(permissions, "INVOICES", "DELETE");
  const canExport = can(permissions, "INVOICES", "EXPORT");
  const canCreateInvoice = canCreate && options.clients.length > 0 && options.items.length > 0;

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card className="rounded-[28px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Krijo faturë shitjeje" : "Create sales invoice"}
          </h2>
          {canCreateInvoice ? (
            <div className="mt-6">
              <InvoiceBuilderForm
                locale={typedLocale}
                clients={options.clients.map((client) => ({
                  id: client.id,
                  name: client.name,
                  vatRate: client.vatRate,
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
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-black/8 bg-white/75 p-5">
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                {typedLocale === "sq"
                  ? "Shtoni klient dhe artikull në inventar para se të krijoni faturën e parë."
                  : "Add a client and an inventory item before creating the first invoice."}
              </p>
              <Link
                href={`/${typedLocale}/admin/clients`}
                className={buttonClasses({ variant: "secondary" })}
              >
                {typedLocale === "sq" ? "Shto klient" : "Add client"}
              </Link>
            </div>
          )}
        </Card>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/invoices`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq"
              ? "Kërko fatura shitjeje, klientë ose artikuj"
              : "Search sales invoices, clients, or items"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka fatura shitjeje për këtë kërkim."
              : "No sales invoices match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Fatura e shitjes" : "Sales invoice", sortable: true },
            { key: "client", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
            { key: "dueDate", label: typedLocale === "sq" ? "Afati" : "Due date", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Totali / Borxhi" : "Total / Debt", sortable: true, align: "right" },
          ]}
          rows={invoices.map((invoice) => {
            const outstandingCents = invoice.totalCents - invoice.amountPaidCents;

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
              },
              actions: (
                <>
                  <details className="w-full min-w-[260px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                    <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                      {typedLocale === "sq" ? "Shiko" : "View"}
                    </summary>
                    <div className="mt-2 space-y-2 text-sm text-[var(--color-muted)]">
                      {invoice.items.map((item) => (
                        <p key={item.id}>
                          {item.productName}: {item.quantity} x {formatCurrency(item.unitPriceCents, localeString)}
                        </p>
                      ))}
                      {invoice.notes ? (
                        <p className="whitespace-pre-wrap pt-2">{invoice.notes}</p>
                      ) : null}
                    </div>
                  </details>
                  {canExport ? (
                    <Link
                      href={`/api/invoices/${invoice.id}/pdf`}
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      PDF
                    </Link>
                  ) : null}
                  {canEdit ? (
                    <details className="w-full min-w-[320px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                      <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                        {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                      </summary>
                      <form
                        action={updateInvoiceAction.bind(null, typedLocale, invoice.id)}
                        className="mt-3 grid gap-2"
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
                          defaultValue={invoice.dueDate.toISOString().slice(0, 10)}
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
                          {typedLocale === "sq" ? "Apliko TVSH" : "Apply VAT"} ({invoice.client.vatRate}%)
                        </label>
                        <textarea name="notes" defaultValue={invoice.notes ?? ""} className={inputClassName} />
                        <button className={buttonClasses({ size: "sm" })}>
                          {typedLocale === "sq" ? "Përditëso" : "Update"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                  {canDelete ? (
                    <form action={deleteInvoiceAction.bind(null, typedLocale, invoice.id)}>
                      <button className={buttonClasses({ variant: "danger", size: "sm" })}>
                        {typedLocale === "sq" ? "Fshi" : "Delete"}
                      </button>
                    </form>
                  ) : null}
                </>
              ),
            };
          })}
        />
      </Card>
    </div>
  );
}
