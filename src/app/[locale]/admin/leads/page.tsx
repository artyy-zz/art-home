import { convertLeadToClientAction, deleteLeadAction, updateLeadStatusAction } from "@/actions/admin";
import { RecordTable } from "@/components/admin/record-table";
import { Badge } from "@/components/shared/badge";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { getLeadsOverview, statusTone } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LeadsPage({
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
  const leads = await getLeadsOverview();
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canEdit = can(permissions, "LEADS", "EDIT");
  const canDelete = can(permissions, "LEADS", "DELETE");
  const canCreateClient = can(permissions, "CLIENTS", "CREATE");

  return (
    <Card className="rounded-[28px] p-6">
      <RecordTable
        currentPath={`/${typedLocale}/admin/leads`}
        query={query}
        sort={sort}
        direction={direction}
        searchPlaceholder={
          typedLocale === "sq" ? "Kërko sipas emrit, emailit ose telefonit" : "Search by name, email, or phone"
        }
        searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
        emptyMessage={
          typedLocale === "sq"
            ? "Nuk ka kërkesa për këtë kërkim."
            : "No requests match this search."
        }
        actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
        columns={[
          { key: "name", label: typedLocale === "sq" ? "Klienti" : "Client", sortable: true },
          { key: "contact", label: "Contact" },
          { key: "status", label: typedLocale === "sq" ? "Statusi" : "Status", sortable: true },
          { key: "createdAt", label: typedLocale === "sq" ? "Data" : "Date", sortable: true },
          { key: "source", label: typedLocale === "sq" ? "Burimi" : "Source" },
        ]}
        rows={leads.map((lead) => ({
          id: lead.id,
          searchText: `${lead.name} ${lead.phone} ${lead.email} ${lead.description} ${lead.status}`,
          sortValues: {
            name: lead.name,
            status: lead.status,
            createdAt: lead.createdAt,
            source: lead.sourceLocale,
          },
          cells: {
            name: (
              <div>
                <p className="font-semibold">{lead.name}</p>
                <p className="mt-1 max-w-[260px] truncate text-xs text-[var(--color-muted)]">
                  {lead.description}
                </p>
              </div>
            ),
            contact: (
              <div className="space-y-1 text-[var(--color-muted)]">
                <p>{lead.phone}</p>
                <p>{lead.email}</p>
              </div>
            ),
            status: <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>,
            createdAt: formatDate(lead.createdAt, localeString),
            source: (
              <div className="space-y-1 text-[var(--color-muted)]">
                <p>{lead.sourceLocale.toUpperCase()}</p>
                {lead.client ? <p>{lead.client.name}</p> : null}
              </div>
            ),
          },
          actions: (
            <>
              <details className="w-full min-w-[220px] rounded-2xl border border-black/8 bg-white/80 p-2 text-left">
                <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-foreground)]">
                  {typedLocale === "sq" ? "Shiko" : "View"}
                </summary>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  {lead.description}
                </p>
              </details>
              {canEdit ? (
                <form action={updateLeadStatusAction.bind(null, typedLocale, lead.id)} className="flex gap-2">
                  <select
                    name="status"
                    defaultValue={lead.status}
                    className="h-10 rounded-full border border-black/10 bg-white/90 px-3 text-sm text-[var(--color-foreground)]"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  <button className={buttonClasses({ size: "sm" })}>
                    {typedLocale === "sq" ? "Ruaj" : "Save"}
                  </button>
                </form>
              ) : null}
              {canEdit && canCreateClient ? (
                <form action={convertLeadToClientAction.bind(null, typedLocale, lead.id)}>
                  <button className={buttonClasses({ variant: "secondary", size: "sm" })}>
                    {typedLocale === "sq" ? "Konverto" : "Convert"}
                  </button>
                </form>
              ) : null}
              {canDelete ? (
                <form action={deleteLeadAction.bind(null, typedLocale, lead.id)}>
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
  );
}
