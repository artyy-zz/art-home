import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  createDeliveryNoteAction,
  deleteDeliveryNoteAction,
  updateDeliveryNoteAction,
} from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
import { DeliveryNoteBuilderForm } from "@/components/forms/delivery-note-builder-form";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import {
  getDeliveryNoteBuilderOptions,
  getDeliveryNoteOverview,
  statusTone,
} from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { cn, formatDate, formatDateInputValue } from "@/lib/utils";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

const typeLabels = {
  sq: {
    SALES: "Fletë Dërgesë Shitje",
    PURCHASE: "Fletë Dërgesë Blerje",
  },
  en: {
    SALES: "Sales Delivery Note",
    PURCHASE: "Purchase Delivery Note",
  },
} as const;

const statusLabels = {
  sq: {
    DRAFT: "Draft",
    DELIVERED: "Dërguar",
    CANCELLED: "Anuluar",
  },
  en: {
    DRAFT: "Draft",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  },
} as const;

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function DeliveryNotesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/delivery-notes">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "DELIVERY_NOTES", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "issuedAt";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const activeType = param(resolvedSearchParams, "type") === "PURCHASE" ? "PURCHASE" : "SALES";
  const [deliveryNotes, options] = await Promise.all([
    getDeliveryNoteOverview(),
    getDeliveryNoteBuilderOptions(typedLocale),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "DELIVERY_NOTES", "CREATE");
  const canEdit = can(permissions, "DELIVERY_NOTES", "EDIT");
  const canDelete = can(permissions, "DELIVERY_NOTES", "DELETE");
  const canExport = can(permissions, "DELIVERY_NOTES", "EXPORT");
  const canCreateDeliveryNote =
    canCreate &&
    options.clients.length > 0 &&
    options.suppliers.length > 0 &&
    options.items.length > 0;
  const filteredNotes = deliveryNotes.filter((note) => note.type === activeType);
  const tabHref = (type: "SALES" | "PURCHASE") =>
    `/${typedLocale}/admin/delivery-notes?type=${type}`;

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Krijo fletë dërgesë" : "Create delivery note"}
          buttonLabel={typedLocale === "sq" ? "Shto fletë dërgesë" : "Add delivery note"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          {canCreateDeliveryNote ? (
            <div>
              <DeliveryNoteBuilderForm
                locale={typedLocale}
                clients={options.clients.map((client) => ({
                  id: client.id,
                  name: client.name,
                }))}
                suppliers={options.suppliers.map((supplier) => ({
                  id: supplier.id,
                  name: supplier.name,
                }))}
                items={options.items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  categoryTitle: item.categoryTitle,
                }))}
                action={createDeliveryNoteAction.bind(null, typedLocale)}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border-[2.25px] border-black/18 bg-white/75 p-5 text-sm leading-7 text-[var(--color-muted)]">
              {typedLocale === "sq"
                ? "Shtoni klient, furnitor dhe artikull para se të krijoni fletë dërgesën e parë."
                : "Add a client, supplier, and item before creating the first delivery note."}
            </div>
          )}
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {(["SALES", "PURCHASE"] as const).map((type) => (
            <Link
              key={type}
              href={tabHref(type)}
              className={cn(
                buttonClasses({ variant: activeType === type ? "primary" : "secondary", size: "sm" }),
                "min-w-44",
                activeType === type && "!text-white",
              )}
            >
              {typeLabels[typedLocale][type]}
            </Link>
          ))}
        </div>
        <RecordTable
          currentPath={`/${typedLocale}/admin/delivery-notes`}
          preservedParams={{ type: activeType }}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq"
              ? "Kërko fletë dërgesa, klientë, furnitorë ose artikuj"
              : "Search delivery notes, clients, suppliers, or items"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka fletë dërgesa për këtë kërkim."
              : "No delivery notes match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Numri" : "Number", sortable: true },
            { key: "type", label: typedLocale === "sq" ? "Tipi" : "Type", sortable: true },
            { key: "party", label: typedLocale === "sq" ? "Klient / Furnitor" : "Client / Supplier", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
            { key: "items", label: typedLocale === "sq" ? "Artikujt" : "Items" },
            { key: "issuedAt", label: typedLocale === "sq" ? "Data" : "Date", sortable: true },
            { key: "notes", label: typedLocale === "sq" ? "Shënime" : "Notes" },
          ]}
          rows={filteredNotes.map((note) => {
            const party = note.type === "SALES" ? note.client?.name : note.supplier?.name;

            return {
              id: note.id,
              searchText: `${note.number} ${typeLabels[typedLocale][note.type]} ${party ?? ""} ${note.status} ${note.notes ?? ""} ${note.items.map((item) => item.productName).join(" ")}`,
              sortValues: {
                number: note.number,
                type: typeLabels[typedLocale][note.type],
                party: party ?? "",
                status: note.status,
                issuedAt: note.issuedAt,
              },
              cells: {
                number: (
                  <div>
                    <p className="font-semibold">{note.number}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {formatDate(note.createdAt, localeString)}
                    </p>
                  </div>
                ),
                type: typeLabels[typedLocale][note.type],
                party: party ?? "-",
                status: <Badge tone={statusTone(note.status)}>{statusLabels[typedLocale][note.status]}</Badge>,
                items: (
                  <div className="space-y-1 text-sm text-[var(--color-muted)]">
                    {note.items.map((item) => (
                      <p key={item.id}>
                        {item.productName}: {item.quantity}
                      </p>
                    ))}
                  </div>
                ),
                issuedAt: formatDate(note.issuedAt, localeString),
                notes: (
                  <p className="max-w-[220px] whitespace-pre-wrap text-[var(--color-muted)]">
                    {note.notes || "-"}
                  </p>
                ),
              },
              actions: (
                <div className="inline-flex flex-wrap items-center justify-end gap-2">
                  {canExport ? (
                    <Link
                      href={`/api/delivery-notes/${note.id}/pdf`}
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
                        action={updateDeliveryNoteAction.bind(null, typedLocale, note.id)}
                        className="absolute right-0 z-20 mt-2 grid w-[min(90vw,340px)] gap-2 rounded-2xl border-[2.25px] border-black/18 bg-[#fbf8f4] p-3 shadow-[0_18px_48px_rgba(18,16,14,0.16)]"
                      >
                        <select name="status" defaultValue={note.status} className={inputClassName}>
                          <option value="DRAFT">{statusLabels[typedLocale].DRAFT}</option>
                          <option value="DELIVERED">{statusLabels[typedLocale].DELIVERED}</option>
                          <option value="CANCELLED">{statusLabels[typedLocale].CANCELLED}</option>
                        </select>
                        <input
                          name="issuedAt"
                          type="date"
                          defaultValue={formatDateInputValue(note.issuedAt)}
                          className={inputClassName}
                        />
                        <textarea name="notes" defaultValue={note.notes ?? ""} className={inputClassName} />
                        <button className={buttonClasses({ size: "sm" })}>
                          {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                        </button>
                      </form>
                    </details>
                  ) : null}
                  {canDelete ? (
                    <form action={deleteDeliveryNoteAction.bind(null, typedLocale, note.id)}>
                      <ConfirmDeleteButton
                        label={typedLocale === "sq" ? "Fshi" : "Delete"}
                        message={
                          typedLocale === "sq"
                            ? `A je i sigurt që dëshiron ta fshish "${note.number}"?`
                            : `Are you sure you want to delete "${note.number}"?`
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
  );
}
