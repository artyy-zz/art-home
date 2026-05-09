import { withPagePerf } from "@/lib/perf";
import { createOfferAction } from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { LazyOfferBuilderForm } from "@/components/admin/lazy-admin-options";
import { OfferActions } from "@/components/admin/offer-actions";
import { RecordTable } from "@/components/admin/record-table";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { getOfferOverviewPage, statusTone } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabels = {
  sq: {
    PENDING: "Ne pritje",
    ACCEPTED: "E pranuar",
    REJECTED: "E refuzuar",
  },
  en: {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
  },
} as const;

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function OffersPage({
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
  const canCreate = can(permissions, "OFFERS", "CREATE");
  const offers = await getOfferOverviewPage({
    page: parsePage(resolvedSearchParams.page),
    query,
    sort,
    direction,
  });
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canEdit = can(permissions, "OFFERS", "EDIT");
  const canDelete = can(permissions, "OFFERS", "DELETE");
  const canExport = can(permissions, "OFFERS", "EXPORT");

  return measureDetailSync(
    "admin/offers.table mapping/formatting",
    () => (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Krijo oferte" : "Create offer"}
          buttonLabel={typedLocale === "sq" ? "Shto oferte" : "Add offer"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <LazyOfferBuilderForm
            locale={typedLocale}
            action={createOfferAction.bind(null, typedLocale)}
          />
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/offers`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kerko oferta, kliente ose artikuj" : "Search offers, clients, or items"
          }
          searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka oferta per kete kerkim."
              : "No offers match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          serverControlled
          pagination={{
            page: offers.page,
            totalPages: offers.totalPages,
            totalItems: offers.totalItems,
            pageSize: offers.pageSize,
            hasNextPage: offers.hasNextPage,
            hasPreviousPage: offers.hasPreviousPage,
            exactTotal: offers.exactTotal,
            label:
              typedLocale === "sq"
                ? "Faqja {page} nga {totalPages} - {totalItems} oferta"
                : "Page {page} of {totalPages} - {totalItems} offers",
            previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
            nextLabel: typedLocale === "sq" ? "Para" : "Next",
          }}
          columns={[
            { key: "number", label: typedLocale === "sq" ? "Oferta" : "Offer", sortable: true },
            { key: "client", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
            { key: "notes", label: typedLocale === "sq" ? "Shenime" : "Notes" },
            { key: "validUntil", label: typedLocale === "sq" ? "Vlen deri" : "Valid until", sortable: true },
            { key: "total", label: typedLocale === "sq" ? "Totali" : "Total", sortable: true, align: "right" },
          ]}
          rows={offers.items.map((offer) => ({
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
                    {typedLocale === "sq" ? "Oferte" : "Offer"}
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
              <OfferActions
                locale={typedLocale}
                offer={{
                  id: offer.id,
                  number: offer.number,
                  status: offer.status,
                  validUntil: offer.validUntil,
                  createdAt: offer.createdAt,
                  vatEnabled: offer.vatEnabled,
                  notes: offer.notes,
                }}
                canEdit={canEdit}
                canDelete={canDelete}
                canExport={canExport}
              />
            ),
          }))}
        />
      </Card>
    </div>
    ),
    { locale: typedLocale, rows: offers.items.length },
  );
}

export default withPagePerf("admin/offers", OffersPage);
