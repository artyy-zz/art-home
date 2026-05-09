import { withPagePerf } from "@/lib/perf";
import { createSupplierAction } from "@/actions/admin";
import { CreateActionForm, CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
import { SupplierActions } from "@/components/admin/supplier-actions";
import { Card } from "@/components/shared/card";
import { getSupplierOverviewPage } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function SuppliersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/suppliers">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "SUPPLIERS", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "name";
  const direction = param(resolvedSearchParams, "dir") === "desc" ? "desc" : "asc";
  const suppliers = await getSupplierOverviewPage({
    page: parsePage(resolvedSearchParams.page),
    query,
    sort,
    direction,
  });
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "SUPPLIERS", "CREATE");
  const canEdit = can(permissions, "SUPPLIERS", "EDIT");
  const canDelete = can(permissions, "SUPPLIERS", "DELETE");
  const rows = measureDetailSync(
    "admin/suppliers.table mapping/formatting",
    () =>
      suppliers.items.map((supplier) => ({
        id: supplier.id,
        searchText: `${supplier.name} ${supplier.email ?? ""} ${supplier.phone ?? ""} ${supplier.address ?? ""} ${supplier.nui ?? ""} ${supplier.vatNumber ?? ""} ${supplier.notes ?? ""}`,
        sortValues: {
          name: supplier.name,
          activity: supplier.purchaseInvoiceCount,
          debt: supplier.outstandingDebtCents,
          lastPurchaseInvoice: supplier.lastPurchaseInvoiceAt,
        },
        cells: {
          name: (
            <div>
              <p className="font-semibold">{supplier.name}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {supplier.contactPerson || (typedLocale === "sq" ? "Pa kontakt" : "No contact")}
              </p>
            </div>
          ),
          contact: (
            <div className="space-y-1 text-[var(--color-muted)]">
              <p>{supplier.email || "-"}</p>
              <p>{supplier.phone || "-"}</p>
              <p className="max-w-[220px] truncate">{supplier.address || "-"}</p>
            </div>
          ),
          tax: (
            <div className="space-y-1 text-[var(--color-muted)]">
              <p>{supplier.nui || "-"}</p>
              <p>
                {typedLocale === "sq" ? "Numri i TVSH" : "VAT number"}{" "}
                {supplier.vatNumber || "-"}
              </p>
            </div>
          ),
          notes: (
            <p className="max-w-[260px] whitespace-pre-wrap text-[var(--color-muted)]">
              {supplier.notes || "-"}
            </p>
          ),
          activity: `${supplier.purchaseInvoiceCount} ${
            typedLocale === "sq" ? "fatura blerjeje" : "purchase invoices"
          }`,
          debt: formatCurrency(supplier.outstandingDebtCents, localeString),
          lastPurchaseInvoice: supplier.lastPurchaseInvoiceAt
            ? formatDate(supplier.lastPurchaseInvoiceAt, localeString)
            : "-",
        },
        actions: (
          <SupplierActions
            locale={typedLocale}
            supplier={{
              id: supplier.id,
              name: supplier.name,
              contactPerson: supplier.contactPerson,
              nui: supplier.nui,
              vatNumber: supplier.vatNumber,
              email: supplier.email,
              phone: supplier.phone,
              address: supplier.address,
              notes: supplier.notes,
            }}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ),
      })),
    { locale: typedLocale, rows: suppliers.items.length },
  );

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Shto furnitor te ri" : "Add new supplier"}
          buttonLabel={typedLocale === "sq" ? "Shto furnitor" : "Add supplier"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <CreateActionForm
            action={createSupplierAction.bind(null, typedLocale)}
            className="grid gap-4 md:grid-cols-3"
            submitLabel={typedLocale === "sq" ? "Ruaj furnitorin" : "Save supplier"}
            cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
            errorMessage={typedLocale === "sq" ? "Furnitori nuk u ruajt." : "Supplier could not be saved."}
            footerClassName="md:col-span-3"
          >
            <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri i furnitorit" : "Supplier name"} />
            <input name="contactPerson" className={inputClassName} placeholder={typedLocale === "sq" ? "Personi kontaktues" : "Contact person"} />
            <input name="nui" className={inputClassName} placeholder="NUI" />
            <input name="email" className={inputClassName} placeholder="Email" />
            <input name="phone" className={inputClassName} placeholder={typedLocale === "sq" ? "Telefoni" : "Phone"} />
            <input
              name="vatNumber"
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Numri i TVSH" : "VAT number"}
            />
            <input name="address" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Adresa" : "Address"} />
            <textarea name="notes" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Shenime" : "Notes"} />
          </CreateActionForm>
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/suppliers`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kerko furnitore, email, telefon" : "Search suppliers, email, phone"
          }
          searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka furnitore per kete kerkim."
              : "No suppliers match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          serverControlled
          pagination={{
            page: suppliers.page,
            totalPages: suppliers.totalPages,
            totalItems: suppliers.totalItems,
            pageSize: suppliers.pageSize,
            label:
              typedLocale === "sq"
                ? "Faqja {page} nga {totalPages} - {totalItems} furnitore"
                : "Page {page} of {totalPages} - {totalItems} suppliers",
            previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
            nextLabel: typedLocale === "sq" ? "Para" : "Next",
          }}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Furnitori" : "Supplier", sortable: true },
            { key: "contact", label: "Contact" },
            { key: "tax", label: typedLocale === "sq" ? "NUI / TVSH" : "NUI / VAT" },
            { key: "notes", label: typedLocale === "sq" ? "Shenime" : "Notes" },
            { key: "activity", label: typedLocale === "sq" ? "Aktiviteti" : "Activity", sortable: true },
            { key: "debt", label: typedLocale === "sq" ? "Borxhi" : "Debt", sortable: true, align: "right" },
            { key: "lastPurchaseInvoice", label: typedLocale === "sq" ? "Fatura e fundit" : "Last invoice", sortable: true },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
}

export default withPagePerf("admin/suppliers", SuppliersPage);
