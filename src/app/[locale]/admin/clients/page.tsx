import { createClientAction, deleteClientAction, updateClientAction } from "@/actions/admin";
import { RecordTable } from "@/components/admin/record-table";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { getClientOverview } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
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

export default async function ClientsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/clients">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "CLIENTS", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "name";
  const direction = param(resolvedSearchParams, "dir") === "desc" ? "desc" : "asc";
  const clients = await getClientOverview();
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "CLIENTS", "CREATE");
  const canEdit = can(permissions, "CLIENTS", "EDIT");
  const canDelete = can(permissions, "CLIENTS", "DELETE");

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card className="rounded-[28px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Shto klient të ri" : "Add new client"}
          </h2>
          <form action={createClientAction.bind(null, typedLocale)} className="mt-6 grid gap-4 md:grid-cols-3">
            <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri i klientit" : "Client name"} />
            <input name="contactPerson" className={inputClassName} placeholder={typedLocale === "sq" ? "Personi kontaktues" : "Contact person"} />
            <input name="email" className={inputClassName} placeholder="Email" />
            <input name="phone" className={inputClassName} placeholder={typedLocale === "sq" ? "Telefoni" : "Phone"} />
            <input name="address" className={`${inputClassName} md:col-span-2`} placeholder={typedLocale === "sq" ? "Adresa" : "Address"} />
            <textarea name="notes" className={`${inputClassName} md:col-span-3`} placeholder={typedLocale === "sq" ? "Shënime" : "Notes"} />
            <button className={buttonClasses({ className: "md:col-span-3 md:w-fit" })}>
              {typedLocale === "sq" ? "Ruaj klientin" : "Save client"}
            </button>
          </form>
        </Card>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/clients`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kërko klientë, email, telefon" : "Search clients, email, phone"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka klientë për këtë kërkim."
              : "No clients match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
            { key: "contact", label: "Contact" },
            { key: "activity", label: typedLocale === "sq" ? "Aktiviteti" : "Activity", sortable: true },
            { key: "debt", label: typedLocale === "sq" ? "Borxhi" : "Debt", sortable: true, align: "right" },
            { key: "lastInvoice", label: typedLocale === "sq" ? "Fatura e fundit" : "Last invoice", sortable: true },
          ]}
          rows={clients.map((client) => ({
            id: client.id,
            searchText: `${client.name} ${client.email ?? ""} ${client.phone ?? ""} ${client.address ?? ""} ${client.notes ?? ""}`,
            sortValues: {
              name: client.name,
              activity: client.invoiceCount + client.offerCount,
              debt: client.outstandingDebtCents,
              lastInvoice: client.lastInvoiceAt,
            },
            cells: {
              name: (
                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {client.contactPerson || (typedLocale === "sq" ? "Pa kontakt" : "No contact")}
                  </p>
                </div>
              ),
              contact: (
                <div className="space-y-1 text-[var(--color-muted)]">
                  <p>{client.email || "-"}</p>
                  <p>{client.phone || "-"}</p>
                  <p className="max-w-[220px] truncate">{client.address || "-"}</p>
                </div>
              ),
              activity: `${client.invoiceCount} ${typedLocale === "sq" ? "fatura" : "invoices"} / ${client.offerCount} ${typedLocale === "sq" ? "oferta" : "offers"}`,
              debt: formatCurrency(client.outstandingDebtCents, localeString),
              lastInvoice: client.lastInvoiceAt ? formatDate(client.lastInvoiceAt, localeString) : "-",
            },
            actions: (
              <>
                <details className="w-full min-w-[260px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                  <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                    {typedLocale === "sq" ? "Shiko" : "View"}
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    {client.notes || (typedLocale === "sq" ? "Pa shënime shtesë." : "No additional notes.")}
                  </p>
                </details>
                {canEdit ? (
                  <details className="w-full min-w-[300px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                    <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                      {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                    </summary>
                    <form action={updateClientAction.bind(null, typedLocale, client.id)} className="mt-3 grid gap-2">
                      <input name="name" required defaultValue={client.name} className={inputClassName} />
                      <input name="contactPerson" defaultValue={client.contactPerson ?? ""} className={inputClassName} />
                      <input name="email" defaultValue={client.email ?? ""} className={inputClassName} />
                      <input name="phone" defaultValue={client.phone ?? ""} className={inputClassName} />
                      <input name="address" defaultValue={client.address ?? ""} className={inputClassName} />
                      <textarea name="notes" defaultValue={client.notes ?? ""} className={inputClassName} />
                      <button className={buttonClasses({ size: "sm" })}>
                        {typedLocale === "sq" ? "Ruaj" : "Save"}
                      </button>
                    </form>
                  </details>
                ) : null}
                {canDelete ? (
                  <form action={deleteClientAction.bind(null, typedLocale, client.id)}>
                    <button className={buttonClasses({ variant: "danger", size: "sm" })}>
                      {typedLocale === "sq" ? "Fshi" : "Delete"}
                    </button>
                  </form>
                ) : null}
              </>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
