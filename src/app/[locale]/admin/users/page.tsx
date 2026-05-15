import { createUserAction, deleteUserAction, updateUserPermissionsAction } from "@/actions/admin";
import { Prisma } from "@prisma/client";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { PermissionChecklist } from "@/components/admin/permission-checklist";
import { RecordTable } from "@/components/admin/record-table";
import { UserCreateForm } from "@/components/forms/user-create-form";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Locale } from "@/lib/i18n";
import { paginatedSliceResult, paginationSliceArgs, parsePage } from "@/lib/pagination";
import { measureDetailAsync, measureDetailSync, withPagePerf } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import {
  createEmptyPermissionMatrix,
  permissionActions,
  permissionModules,
  permissionStats,
  type PermissionMatrix,
} from "@/lib/permissions-config";
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

function contains(value: string | undefined) {
  return value?.trim() ? { contains: value.trim(), mode: "insensitive" as const } : undefined;
}

function sortDirection(direction: "asc" | "desc") {
  return direction === "asc" ? "asc" : "desc";
}

function createFullPermissionMatrix() {
  return Object.fromEntries(
    permissionModules.map((module) => [
      module,
      Object.fromEntries(permissionActions.map((action) => [action, true])),
    ]),
  ) as PermissionMatrix;
}

function isPermissionModule(value: string): value is (typeof permissionModules)[number] {
  return (permissionModules as readonly string[]).includes(value);
}

function isPermissionAction(value: string): value is (typeof permissionActions)[number] {
  return (permissionActions as readonly string[]).includes(value);
}

function permissionMatrixForUser(record: {
  email: string;
  role: string;
  roleRecord?: { isOwner: boolean } | null;
  permissions: Array<{ module: string; action: string; allowed: boolean }>;
}) {
  if (isProtectedOwnerUser(record)) {
    return createFullPermissionMatrix();
  }

  const matrix = createEmptyPermissionMatrix();
  for (const permission of record.permissions) {
    if (isPermissionModule(permission.module) && isPermissionAction(permission.action)) {
      matrix[permission.module][permission.action] = permission.allowed;
    }
  }

  return matrix;
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
  const page = parsePage(resolvedSearchParams.page);
  const search = contains(query);
  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { name: search },
          { email: search },
          { roleRecord: { name: search } },
        ],
      }
    : {};
  const orderBy: Prisma.UserOrderByWithRelationInput =
    sort === "permissions"
      ? { permissions: { _count: sortDirection(direction) } }
      : sort === "lastLogin"
        ? { lastLoginAt: sortDirection(direction) }
        : sort === "createdAt"
          ? { createdAt: sortDirection(direction) }
          : { name: direction };
  const userItems = await measureDetailAsync(
    "admin/users.main data query",
    () =>
      prisma.user.findMany({
        where,
        orderBy,
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
          permissions: {
            select: {
              module: true,
              action: true,
              allowed: true,
            },
          },
        },
        ...paginationSliceArgs(page),
      }),
    { locale: typedLocale, query, page },
  );
  const users = paginatedSliceResult({ items: userItems, page });
  const userMatrices = measureDetailSync(
    "admin/users.permission matrix mapping",
    () =>
      new Map(
        users.items.map((record) => [record.id, permissionMatrixForUser(record)] as const),
      ),
    { locale: typedLocale, rows: users.items.length },
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
            serverControlled
            pagination={{
              page: users.page,
              totalPages: users.totalPages,
              totalItems: users.totalItems,
              pageSize: users.pageSize,
              hasNextPage: users.hasNextPage,
              hasPreviousPage: users.hasPreviousPage,
              exactTotal: users.exactTotal,
              label:
                typedLocale === "sq"
                  ? "Faqja {page} nga {totalPages} - {totalItems} perdorues"
                  : "Page {page} of {totalPages} - {totalItems} users",
              previousLabel: typedLocale === "sq" ? "Prapa" : "Previous",
              nextLabel: typedLocale === "sq" ? "Para" : "Next",
            }}
            columns={[
              { key: "name", label: typedLocale === "sq" ? "Perdoruesi" : "User", sortable: true },
              { key: "permissions", label: typedLocale === "sq" ? "Lejet" : "Permissions", sortable: true },
              { key: "lastLogin", label: typedLocale === "sq" ? "Hyrja e fundit" : "Last login", sortable: true },
              { key: "createdAt", label: typedLocale === "sq" ? "Krijuar" : "Created", sortable: true },
            ]}
            rows={users.items.map((record) => {
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
              {users.items.map((record) => {
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
                            <SubmitButton size="sm" className="gap-2">
                              <Check className="h-4 w-4" />
                              {typedLocale === "sq" ? "Ruaj lejet" : "Save permissions"}
                            </SubmitButton>
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
    { locale: typedLocale, rows: users.items.length },
  );
}

export default withPagePerf("admin/users", UsersPage);
