import { createUserAction, deleteUserAction, updateUserPermissionsAction } from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { PermissionChecklist } from "@/components/admin/permission-checklist";
import { RecordTable } from "@/components/admin/record-table";
import { UserCreateForm } from "@/components/forms/user-create-form";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";
import { measureDetailAsync, measureDetailSync, withPagePerf } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { createEmptyPermissionMatrix, permissionStats } from "@/lib/permissions-config";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Check } from "lucide-react";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isProtectedOwnerUser(user: { email: string; role: string; roleRecord?: { isOwner: boolean } | null }) {
  return (
    user.email.toLowerCase() === "artiibela0@gmail.com" ||
    user.role === "OWNER" ||
    Boolean(user.roleRecord?.isOwner)
  );
}

async function UsersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "USERS", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const resolvedSearchParams = await searchParams;
  const query = param(resolvedSearchParams, "q");
  const sort = param(resolvedSearchParams, "sort") || "name";
  const direction = param(resolvedSearchParams, "dir") === "desc" ? "desc" : "asc";
  const users = await measureDetailAsync(
    "admin/users.main data query",
    () =>
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roleId: true,
          roleRecord: {
            select: {
              id: true,
              key: true,
              name: true,
              isOwner: true,
              isSystem: true,
            },
          },
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    { locale: typedLocale, query: "users" },
  );
  const userMatrices = new Map(
    await Promise.all(
      users.map(async (record) => [record.id, await getUserPermissionMatrix(record)] as const),
    ),
  );
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "USERS", "CREATE");
  const canEdit = can(permissions, "USERS", "EDIT");
  const canDelete = can(permissions, "USERS", "DELETE");
  const currentUserIsOwner = isProtectedOwnerUser(user);

  return measureDetailSync(
    "admin/users.table mapping/formatting",
    () => (
      <div className="space-y-6">
        {canCreate ? (
          <CreateFormPanel
            title={typedLocale === "sq" ? "Shto perdorues" : "Add user"}
            buttonLabel={typedLocale === "sq" ? "Shto perdorues" : "Add user"}
            cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
          >
            <UserCreateForm
              locale={typedLocale}
              action={createUserAction.bind(null, typedLocale)}
            />
          </CreateFormPanel>
        ) : null}

        <Card className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
          <RecordTable
            currentPath={`/${typedLocale}/admin/users`}
            query={query}
            sort={sort}
            direction={direction}
            searchPlaceholder={
              typedLocale === "sq" ? "Kerko perdorues ose email" : "Search users or email"
            }
            searchLabel={typedLocale === "sq" ? "Kerko" : "Search"}
            emptyMessage={
              typedLocale === "sq"
                ? "Nuk ka perdorues per kete kerkim."
                : "No users match this search."
            }
            actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
            columns={[
              { key: "name", label: typedLocale === "sq" ? "Perdoruesi" : "User", sortable: true },
              { key: "permissions", label: typedLocale === "sq" ? "Lejet" : "Permissions", sortable: true },
              { key: "lastLogin", label: typedLocale === "sq" ? "Hyrja e fundit" : "Last login", sortable: true },
              { key: "createdAt", label: typedLocale === "sq" ? "Krijuar" : "Created", sortable: true },
            ]}
            rows={users.map((record) => {
              const matrix = userMatrices.get(record.id) ?? createEmptyPermissionMatrix();
              const stats = permissionStats(matrix);
              const isProtectedOwner = isProtectedOwnerUser(record);

              return {
                id: record.id,
                searchText: `${record.name} ${record.email}`,
                sortValues: {
                  name: record.name,
                  permissions: stats.enabled,
                  lastLogin: record.lastLoginAt,
                  createdAt: record.createdAt,
                },
                cells: {
                  name: (
                    <div>
                      <p className="font-semibold">{record.name}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{record.email}</p>
                    </div>
                  ),
                  permissions: isProtectedOwner
                    ? typedLocale === "sq"
                      ? "Te gjitha"
                      : "All"
                    : `${stats.enabled}/${stats.total}`,
                  lastLogin: record.lastLoginAt ? formatDate(record.lastLoginAt, localeString) : "-",
                  createdAt: formatDate(record.createdAt, localeString),
                },
                actions: canDelete && record.id !== user.id && (!isProtectedOwner || currentUserIsOwner) ? (
                  <form action={deleteUserAction.bind(null, typedLocale, record.id)}>
                    <ConfirmDeleteButton
                      label={typedLocale === "sq" ? "Fshi" : "Delete"}
                      message={
                        typedLocale === "sq"
                          ? `A je i sigurt qe deshiron ta fshish perdoruesin "${record.name}"?`
                          : `Are you sure you want to delete user "${record.name}"?`
                      }
                      className="gap-2"
                    />
                  </form>
                ) : null,
              };
            })}
          />
        </Card>

        {canEdit ? (
          <Card className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                {typedLocale === "sq" ? "Lejet e perdoruesve" : "User permissions"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {typedLocale === "sq"
                  ? "Ndrysho cfare mund te shikoje, krijoje, ndryshoje, fshije ose eksportoje secili perdorues."
                  : "Control what each user can view, create, edit, delete, or export."}
              </p>
            </div>
            <div className="space-y-4">
              {users.map((record) => {
                const matrix = userMatrices.get(record.id) ?? createEmptyPermissionMatrix();
                const stats = permissionStats(matrix);
                const isProtectedOwner = isProtectedOwnerUser(record);

                return (
                  <details
                    key={record.id}
                    className="rounded-2xl border border-black/10 bg-white/70 p-4"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--color-foreground)]">{record.name}</p>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">{record.email}</p>
                        </div>
                        <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                          {isProtectedOwner
                            ? typedLocale === "sq"
                              ? "Te gjitha lejet"
                              : "All permissions"
                            : `${stats.enabled}/${stats.total}`}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-4">
                      {isProtectedOwner ? (
                        <PermissionChecklist locale={typedLocale} matrix={matrix} locked />
                      ) : (
                        <form
                          action={updateUserPermissionsAction.bind(null, typedLocale, record.id)}
                          className="space-y-4"
                        >
                          <PermissionChecklist locale={typedLocale} matrix={matrix} />
                          <div className="flex justify-end">
                            <button className={buttonClasses({ size: "sm", className: "gap-2" })}>
                              <Check className="h-4 w-4" />
                              {typedLocale === "sq" ? "Ruaj lejet" : "Save permissions"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>
    ),
    { locale: typedLocale, rows: users.length },
  );
}

export default withPagePerf("admin/users", UsersPage);
