import {
  deleteQuoteRequestAction,
  updateQuoteRequestStatusAction,
} from "@/actions/admin";
import { QuoteRequestStatusSelect } from "@/components/admin/quote-request-status-select";
import { RecordTable } from "@/components/admin/record-table";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { getQuoteRequestOverviewPage } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { parsePage } from "@/lib/pagination";
import { measureDetailSync, withPagePerf } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

type QuoteRequestStatus = "NEW" | "REVIEWED" | "COMPLETED";

const statusLabels = {
  sq: {
    NEW: "E re",
    REVIEWED: "E shqyrtuar",
    COMPLETED: "E përfunduar",
  },
  en: {
    NEW: "New",
    REVIEWED: "Reviewed",
    COMPLETED: "Completed",
  },
} as const;

const statusTones = {
  NEW: "accent",
  REVIEWED: "warning",
  COMPLETED: "success",
} as const;

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function StatusBadge({
  locale,
  status,
}: {
  locale: Locale;
  status: QuoteRequestStatus;
}) {
  return <Badge tone={statusTones[status]}>{statusLabels[locale][status]}</Badge>;
}

function StatusEditor({
  locale,
  requestId,
  status,
}: {
  locale: Locale;
  requestId: string;
  status: QuoteRequestStatus;
}) {
  return (
    <QuoteRequestStatusSelect
      action={updateQuoteRequestStatusAction.bind(null, locale, requestId)}
      labels={statusLabels[locale]}
      status={status}
    />
  );
}

async function LeadsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/leads">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "LEADS", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "createdAt";
  const direction = param(resolvedSearchParams, "dir") === "asc" ? "asc" : "desc";
  const quoteRequests = await getQuoteRequestOverviewPage({
    page: parsePage(resolvedSearchParams.page),
    query,
    sort,
    direction,
  });
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canEdit = can(permissions, "LEADS", "EDIT");
  const canDelete = can(permissions, "LEADS", "DELETE");

  return measureDetailSync(
    "admin/leads.table mapping/formatting",
    () => (
      <Card className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/leads`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq"
              ? "Kërko kërkesa, emër, telefon ose email"
              : "Search requests, name, phone, or email"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka kërkesa për këtë kërkim."
              : "No quote requests match this search."
          }
          actionsLabel={canEdit || canDelete ? (typedLocale === "sq" ? "Veprime" : "Actions") : undefined}
          serverControlled
          pagination={{
            page: quoteRequests.page,
            totalPages: quoteRequests.totalPages,
            totalItems: quoteRequests.totalItems,
            pageSize: quoteRequests.pageSize,
            hasNextPage: quoteRequests.hasNextPage,
            hasPreviousPage: quoteRequests.hasPreviousPage,
            exactTotal: quoteRequests.exactTotal,
            label:
              typedLocale === "sq"
                ? "Faqja {page} nga {totalPages} - {totalItems} kërkesa"
                : "Page {page} of {totalPages} - {totalItems} requests",
            previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
            nextLabel: typedLocale === "sq" ? "Para" : "Next",
          }}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Emri" : "Name", sortable: true },
            { key: "contact", label: typedLocale === "sq" ? "Kontakti" : "Contact" },
            { key: "details", label: typedLocale === "sq" ? "Detajet" : "Details" },
            { key: "createdAt", label: typedLocale === "sq" ? "Data" : "Submitted", sortable: true },
            { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
          ]}
          rows={quoteRequests.items.map((request) => ({
            id: request.id,
            searchText: `${request.name} ${request.phone ?? ""} ${request.email ?? ""} ${request.details} ${request.status}`,
            sortValues: {
              name: request.name,
              createdAt: request.createdAt,
              status: request.status,
            },
            cells: {
              name: <p className="font-semibold">{request.name}</p>,
              contact: (
                <div className="space-y-1 text-[var(--color-muted)]">
                  <p>{request.phone || "-"}</p>
                  <p className="break-all">{request.email || "-"}</p>
                </div>
              ),
              details: (
                <p className="max-w-[360px] whitespace-pre-wrap text-[var(--color-muted)]">
                  {request.details}
                </p>
              ),
              createdAt: formatDate(request.createdAt, localeString),
              status: <StatusBadge locale={typedLocale} status={request.status} />,
            },
            actions: (
              <>
                {canEdit ? (
                  <StatusEditor
                    locale={typedLocale}
                    requestId={request.id}
                    status={request.status}
                  />
                ) : null}
                {canDelete ? (
                  <form action={deleteQuoteRequestAction.bind(null, typedLocale, request.id)}>
                <ConfirmDeleteButton
                  label={typedLocale === "sq" ? "Fshi" : "Delete"}
                  message={
                    typedLocale === "sq"
                      ? `A je i sigurt që dëshiron ta fshish kërkesën nga "${request.name}"?`
                      : `Are you sure you want to delete the request from "${request.name}"?`
                  }
                />
                  </form>
                ) : null}
              </>
            ),
          }))}
        />
      </Card>
    ),
    { locale: typedLocale, rows: quoteRequests.items.length },
  );
}

export default withPagePerf("admin/leads", LeadsPage);
