import { createClientAction } from "@/actions/admin";
import { ClientActions } from "@/components/admin/client-actions";
import { CreateActionForm, CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
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
        <CreateFormPanel
          title={typedLocale === "sq" ? "Shto klient te ri" : "Add new client"}
          buttonLabel={typedLocale === "sq" ? "Shto klient" : "Add client"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <CreateActionForm
            action={createClientAction.bind(null, typedLocale)}
            className="grid gap-4 md:grid-cols-3"
            submitLabel={typedLocale === "sq" ? "Ruaj klientin" : "Save client"}
            cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
            errorMessage={typedLocale === "sq" ? "Klienti nuk u ruajt." : "Client could not be saved."}
            footerClassName="md:col-span-3"
          >
            <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri i klientit" : "Client name"} />
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
          currentPath={`/${typedLocale}/admin/clients`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kerko kliente, email, telefon" : "Search clients, email, phone"
          }
          searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka kliente per kete kerkim."
              : "No clients match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
            { key: "contact", label: "Contact" },
            { key: "tax", label: typedLocale === "sq" ? "NUI / TVSH" : "NUI / VAT" },
            { key: "notes", label: typedLocale === "sq" ? "Shenime" : "Notes" },
            { key: "activity", label: typedLocale === "sq" ? "Aktiviteti" : "Activity", sortable: true },
            { key: "debt", label: typedLocale === "sq" ? "Borxhi" : "Debt", sortable: true, align: "right" },
            { key: "lastInvoice", label: typedLocale === "sq" ? "Fatura e fundit" : "Last invoice", sortable: true },
          ]}
          rows={clients.map((client) => ({
            id: client.id,
            searchText: `${client.name} ${client.email ?? ""} ${client.phone ?? ""} ${client.address ?? ""} ${client.nui ?? ""} ${client.vatNumber ?? ""} ${client.notes ?? ""}`,
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
              tax: (
                <div className="space-y-1 text-[var(--color-muted)]">
                  <p>{client.nui || "-"}</p>
                  <p>
                    {typedLocale === "sq" ? "Numri i TVSH" : "VAT number"}{" "}
                    {client.vatNumber || "-"}
                  </p>
                </div>
              ),
              notes: (
                <p className="max-w-[260px] whitespace-pre-wrap text-[var(--color-muted)]">
                  {client.notes || "-"}
                </p>
              ),
              activity: `${client.invoiceCount} ${typedLocale === "sq" ? "fatura" : "invoices"} / ${client.offerCount} ${typedLocale === "sq" ? "oferta" : "offers"}`,
              debt: formatCurrency(client.outstandingDebtCents, localeString),
              lastInvoice: client.lastInvoiceAt ? formatDate(client.lastInvoiceAt, localeString) : "-",
            },
            actions: (
              <ClientActions
                locale={typedLocale}
                client={{
                  id: client.id,
                  name: client.name,
                  contactPerson: client.contactPerson,
                  nui: client.nui,
                  vatNumber: client.vatNumber,
                  email: client.email,
                  phone: client.phone,
                  address: client.address,
                  notes: client.notes,
                }}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ),
          }))}
        />
      </Card>
    </div>
  );
}
