import Link from "next/link";
import {
  createOfferAction,
  deleteOfferAction,
  updateOfferStatusAction,
} from "@/actions/admin";
import { RecordTable } from "@/components/admin/record-table";
import { OfferBuilderForm } from "@/components/forms/offer-builder-form";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { getOfferBuilderOptions, getOfferOverview, statusTone } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabels = {
  sq: {
    PENDING: "Në pritje",
    ACCEPTED: "E pranuar",
    REJECTED: "E refuzuar",
  },
  en: {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
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

export default async function OffersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/offers">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "OFFERS", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "createdAt";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const [offers, options] = await Promise.all([
    getOfferOverview(),
    getOfferBuilderOptions(typedLocale),
  ]);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "OFFERS", "CREATE");
  const canEdit = can(permissions, "OFFERS", "EDIT");
  const canDelete = can(permissions, "OFFERS", "DELETE");
  const canExport = can(permissions, "OFFERS", "EXPORT");
  const canCreateOffer = canCreate && options.clients.length > 0 && options.items.length > 0;

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card className="rounded-[28px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Krijo ofertë" : "Create offer"}
          </h2>
          {canCreateOffer ? (
            <div className="mt-6">
              <OfferBuilderForm
                locale={typedLocale}
                clients={options.clients.map((client) => ({
                  id: client.id,
                  name: client.name,
                  vatRate: client.vatRate,
                }))}
                leads={options.leads}
                items={options.items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  unit: item.unit,
                  unitPriceCents: item.unitPriceCents,
                  categoryTitle: item.categoryTitle,
                }))}
                action={createOfferAction.bind(null, typedLocale)}
              />
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-black/8 bg-white/75 p-5">
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                {typedLocale === "sq"
                  ? "Shtoni klient dhe artikull në inventar para se të krijoni ofertën e parë."
                  : "Add a client and an inventory item before creating the first offer."}
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
          currentPath={`/${typedLocale}/admin/offers`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kërko oferta, klientë ose artikuj" : "Search offers, clients, or items"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka oferta për këtë kërkim."
              : "No offers match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Oferta" : "Offer", sortable: true },
            { key: "client", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
            { key: "notes", label: typedLocale === "sq" ? "Shënime" : "Notes" },
            { key: "validUntil", label: typedLocale === "sq" ? "Vlen deri" : "Valid until", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Totali" : "Total", sortable: true, align: "right" },
          ]}
          rows={offers.map((offer) => ({
            id: offer.id,
            searchText: `${offer.number} ${offer.client.name} ${offer.lead?.name ?? ""} ${offer.status} ${offer.notes ?? ""} ${offer.items.map((item) => item.productName).join(" ")}`,
            sortValues: {
              number: offer.number,
              client: offer.client.name,
              status: offer.status,
              validUntil: offer.validUntil ?? offer.createdAt,
              total: offer.totalCents,
              createdAt: offer.createdAt,
            },
            cells: {
              number: (
                <div>
                  <p className="font-semibold">{offer.number}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {offer.lead?.name || (typedLocale === "sq" ? "Ofertë manuale" : "Manual offer")}
                  </p>
                </div>
              ),
              client: offer.client.name,
              status: <Badge tone={statusTone(offer.status)}>{statusLabels[typedLocale][offer.status]}</Badge>,
              notes: (
                <p className="max-w-[260px] whitespace-pre-wrap text-[var(--color-muted)]">
                  {offer.notes || "-"}
                </p>
              ),
              validUntil: formatDate(offer.validUntil ?? offer.createdAt, localeString),
              total: formatCurrency(offer.totalCents, localeString),
            },
            actions: (
              <>
                <details className="w-full min-w-[260px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                  <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                    {typedLocale === "sq" ? "Shiko" : "View"}
                  </summary>
                  <div className="mt-2 space-y-2 text-sm text-[var(--color-muted)]">
                    {offer.items.map((item) => (
                      <p key={item.id}>
                        {item.productName}: {item.quantity} x {formatCurrency(item.unitPriceCents, localeString)}
                      </p>
                    ))}
                  </div>
                </details>
                {canExport ? (
                  <Link
                    href={`/api/offers/${offer.id}/pdf`}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    PDF
                  </Link>
                ) : null}
                {canEdit ? (
                  <details className="w-full min-w-[320px] text-left">
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
                      action={updateOfferStatusAction.bind(null, typedLocale, offer.id)}
                      className="mt-3 grid gap-3 rounded-2xl border border-black/8 bg-white/85 p-3"
                    >
                      <select name="status" defaultValue={offer.status} className={inputClassName}>
                        <option value="PENDING">{statusLabels[typedLocale].PENDING}</option>
                        <option value="ACCEPTED">{statusLabels[typedLocale].ACCEPTED}</option>
                        <option value="REJECTED">{statusLabels[typedLocale].REJECTED}</option>
                      </select>
                      <input
                        name="validUntil"
                        type="date"
                        defaultValue={(offer.validUntil ?? offer.createdAt).toISOString().slice(0, 10)}
                        className={inputClassName}
                      />
                      <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-muted)]">
                        <input type="checkbox" name="vatEnabled" defaultChecked={offer.vatEnabled} className="h-4 w-4" />
                        {typedLocale === "sq" ? "Apliko TVSH" : "Apply VAT"} ({offer.client.vatRate}%)
                      </label>
                      <textarea name="notes" defaultValue={offer.notes ?? ""} className={inputClassName} />
                      <button className={buttonClasses({ size: "sm" })}>
                        {typedLocale === "sq" ? "Përditëso" : "Update"}
                      </button>
                    </form>
                  </details>
                ) : null}
                {canDelete ? (
                  <form action={deleteOfferAction.bind(null, typedLocale, offer.id)}>
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
