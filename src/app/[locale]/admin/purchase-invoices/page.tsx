import Link from "next/link";
import {
  createPurchaseInvoiceAction,
  createSupplierAction,
  deletePurchaseInvoiceAction,
  deleteSupplierAction,
  updatePurchaseInvoiceAction,
  updateSupplierAction,
} from "@/actions/admin";
import { RecordTable } from "@/components/admin/record-table";
import { PurchaseInvoiceBuilderForm } from "@/components/forms/purchase-invoice-builder-form";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import {
  getPurchaseInvoiceBuilderOptions,
  getPurchaseInvoiceOverview,
  getSupplierOverview,
  statusTone,
} from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

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
const fieldLabelClassName =
  "grid gap-1.5 text-xs font-semibold text-[var(--color-muted)]";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PurchaseInvoicesPage({
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
  const [purchaseInvoices, options, suppliers] = await Promise.all([
    getPurchaseInvoiceOverview(),
    getPurchaseInvoiceBuilderOptions(typedLocale),
    getSupplierOverview(),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "PURCHASE_INVOICES", "CREATE");
  const canEdit = can(permissions, "PURCHASE_INVOICES", "EDIT");
  const canDelete = can(permissions, "PURCHASE_INVOICES", "DELETE");
  const canExport = can(permissions, "PURCHASE_INVOICES", "EXPORT");
  const canCreatePurchaseInvoice =
    canCreate && options.suppliers.length > 0 && options.items.length > 0;

  return (
    <div className="space-y-6">
      {(canCreate || canEdit || canDelete) ? (
        <Card className="rounded-[28px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Furnitorët" : "Suppliers"}
          </h2>
          {canCreate ? (
            <form action={createSupplierAction.bind(null, typedLocale)} className="mt-6 grid gap-4 md:grid-cols-3">
              <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri i furnitorit" : "Supplier name"} />
              <input name="contactPerson" className={inputClassName} placeholder={typedLocale === "sq" ? "Personi kontaktues" : "Contact person"} />
              <input name="nui" className={inputClassName} placeholder="NUI" />
              <input name="email" className={inputClassName} placeholder="Email" />
              <input name="phone" className={inputClassName} placeholder={typedLocale === "sq" ? "Telefoni" : "Phone"} />
              <input
                name="vatRate"
                type="number"
                min="0"
                step="0.01"
                defaultValue={18}
                className={inputClassName}
                placeholder={typedLocale === "sq" ? "TVSH %" : "VAT %"}
              />
              <input name="address" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Adresa" : "Address"} />
              <textarea name="notes" className={`${inputClassName} md:col-span-2`} placeholder={typedLocale === "sq" ? "Shënime" : "Notes"} />
              <button className={buttonClasses({ className: "md:w-fit" })}>
                {typedLocale === "sq" ? "Ruaj furnitorin" : "Save supplier"}
              </button>
            </form>
          ) : null}

          {suppliers.length > 0 ? (
            <div className="mt-6 grid gap-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="grid gap-3 rounded-2xl border border-black/8 bg-white/75 p-4 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">{supplier.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {supplier.email || "-"} / {supplier.phone || "-"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      NUI: {supplier.nui || "-"} / {typedLocale === "sq" ? "TVSH" : "VAT"}{" "}
                      {formatNumber(supplier.vatRate, localeString)}%
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {canEdit ? (
                      <details className="w-full min-w-[300px] text-left">
                        <summary
                          className={buttonClasses({
                            variant: "secondary",
                            size: "sm",
                            className: "ml-auto cursor-pointer list-none",
                          })}
                        >
                          {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                        </summary>
                        <form
                          action={updateSupplierAction.bind(null, typedLocale, supplier.id)}
                          className="mt-3 grid gap-3 rounded-2xl border border-black/8 bg-white/85 p-3"
                        >
                          <label className={fieldLabelClassName}>
                            {typedLocale === "sq" ? "Emri i furnitorit" : "Supplier name"}
                            <input name="name" required defaultValue={supplier.name} className={inputClassName} />
                          </label>
                          <label className={fieldLabelClassName}>
                            {typedLocale === "sq" ? "Personi kontaktues" : "Contact person"}
                            <input name="contactPerson" defaultValue={supplier.contactPerson ?? ""} className={inputClassName} />
                          </label>
                          <label className={fieldLabelClassName}>
                            NUI
                            <input name="nui" defaultValue={supplier.nui ?? ""} className={inputClassName} />
                          </label>
                          <label className={fieldLabelClassName}>
                            Email
                            <input name="email" defaultValue={supplier.email ?? ""} className={inputClassName} />
                          </label>
                          <label className={fieldLabelClassName}>
                            {typedLocale === "sq" ? "Telefoni" : "Phone"}
                            <input name="phone" defaultValue={supplier.phone ?? ""} className={inputClassName} />
                          </label>
                          <label className={fieldLabelClassName}>
                            {typedLocale === "sq" ? "TVSH %" : "VAT %"}
                            <input
                              name="vatRate"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={supplier.vatRate}
                              className={inputClassName}
                            />
                          </label>
                          <label className={fieldLabelClassName}>
                            {typedLocale === "sq" ? "Adresa" : "Address"}
                            <input name="address" defaultValue={supplier.address ?? ""} className={inputClassName} />
                          </label>
                          <label className={fieldLabelClassName}>
                            {typedLocale === "sq" ? "Shënime" : "Notes"}
                            <textarea name="notes" defaultValue={supplier.notes ?? ""} className={inputClassName} />
                          </label>
                          <button className={buttonClasses({ size: "sm" })}>
                            {typedLocale === "sq" ? "Përditëso" : "Update"}
                          </button>
                        </form>
                      </details>
                    ) : null}
                    {canDelete ? (
                      <form action={deleteSupplierAction.bind(null, typedLocale, supplier.id)}>
                        <button className={buttonClasses({ variant: "danger", size: "sm" })}>
                          {typedLocale === "sq" ? "Fshi" : "Delete"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {canCreate ? (
        <Card className="rounded-[28px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Krijo faturë blerjeje" : "Create purchase invoice"}
          </h2>
          {canCreatePurchaseInvoice ? (
            <div className="mt-6">
              <PurchaseInvoiceBuilderForm
                locale={typedLocale}
                suppliers={options.suppliers.map((supplier) => ({
                  id: supplier.id,
                  name: supplier.name,
                  vatRate: supplier.vatRate,
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
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-black/8 bg-white/75 p-5">
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                {typedLocale === "sq"
                  ? "Shtoni furnitor dhe artikull në inventar para se të krijoni faturën e parë të blerjes."
                  : "Add a supplier and an inventory item before creating the first purchase invoice."}
              </p>
              <Link
                href={`/${typedLocale}/admin/inventory`}
                className={buttonClasses({ variant: "secondary" })}
              >
                {typedLocale === "sq" ? "Shko te inventari" : "Go to inventory"}
              </Link>
            </div>
          )}
        </Card>
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
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Fatura e blerjes" : "Purchase invoice", sortable: true },
            { key: "supplier", label: typedLocale === "sq" ? "Furnitori" : "Supplier", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
            { key: "dueDate", label: typedLocale === "sq" ? "Afati" : "Due date", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Totali / Borxhi" : "Total / Debt", sortable: true, align: "right" },
          ]}
          rows={purchaseInvoices.map((invoice) => {
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
                      href={`/api/purchase-invoices/${invoice.id}/pdf`}
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
                        action={updatePurchaseInvoiceAction.bind(null, typedLocale, invoice.id)}
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
                          {typedLocale === "sq" ? "Apliko TVSH" : "Apply VAT"} ({invoice.supplier.vatRate}%)
                        </label>
                        <textarea name="notes" defaultValue={invoice.notes ?? ""} className={inputClassName} />
                        <button className={buttonClasses({ size: "sm" })}>
                          {typedLocale === "sq" ? "Përditëso" : "Update"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                  {canDelete ? (
                    <form action={deletePurchaseInvoiceAction.bind(null, typedLocale, invoice.id)}>
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
