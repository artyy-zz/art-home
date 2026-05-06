import { createUserAction, deleteUserAction, updateUserRoleAction } from "@/actions/admin";
import { CreateFormPanel } from "@/components/admin/create-form-panel";
import { RecordTable } from "@/components/admin/record-table";
import { UserCreateForm } from "@/components/forms/user-create-form";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import type { Locale } from "@/lib/i18n";
import { can, getAssignableRoles, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Check, Pencil, X } from "lucide-react";
import Link from "next/link";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function usersHref(
  locale: Locale,
  searchParams: Record<string, string | string[] | undefined>,
  editUserId?: string,
) {
  const params = new URLSearchParams();

  for (const key of ["q", "sort", "dir"]) {
    const value = param(searchParams, key);
    if (value) {
      params.set(key, value);
    }
  }

  if (editUserId) {
    params.set("edit", editUserId);
  }

  const query = params.toString();
  return `/${locale}/admin/users${query ? `?${query}` : ""}`;
}

export default async function UsersPage({
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
  const editUserId = param(resolvedSearchParams, "edit");
  const roles = (await getAssignableRoles()).filter(
    (role) => !role.isOwner || user.role === "OWNER" || user.roleRecord?.isOwner,
  );
  const users = await prisma.user.findMany({
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
          name: true,
          isOwner: true,
        },
      },
      lastLoginAt: true,
      createdAt: true,
    },
  });
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";
  const canCreate = can(permissions, "USERS", "CREATE");
  const canEdit = can(permissions, "USERS", "EDIT");
  const canDelete = can(permissions, "USERS", "DELETE");
  const currentUserIsOwner = user.role === "OWNER" || Boolean(user.roleRecord?.isOwner);

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Shto përdorues" : "Add user"}
          buttonLabel={typedLocale === "sq" ? "Shto përdorues" : "Add user"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <UserCreateForm
            locale={typedLocale}
            roles={roles.map((role) => ({
              id: role.id,
              name: role.name,
              key: role.key,
            }))}
            action={createUserAction.bind(null, typedLocale)}
          />
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <RecordTable
          currentPath={`/${typedLocale}/admin/users`}
          query={query}
          sort={sort}
          direction={direction}
          searchPlaceholder={
            typedLocale === "sq" ? "Kërko përdorues ose email" : "Search users or email"
          }
          searchLabel={typedLocale === "sq" ? "Kërko" : "Search"}
          emptyMessage={
            typedLocale === "sq"
              ? "Nuk ka përdorues për këtë kërkim."
              : "No users match this search."
          }
          actionsLabel={typedLocale === "sq" ? "Veprime" : "Actions"}
          columns={[
            { key: "name", label: typedLocale === "sq" ? "Përdoruesi" : "User", sortable: true },
            { key: "role", label: typedLocale === "sq" ? "Roli" : "Role", sortable: true },
            { key: "lastLogin", label: typedLocale === "sq" ? "Hyrja e fundit" : "Last login", sortable: true },
            { key: "createdAt", label: typedLocale === "sq" ? "Krijuar" : "Created", sortable: true },
          ]}
          rows={users.map((record) => {
            const roleLabel = record.roleRecord?.name ?? record.role;
            const isProtectedOwner = Boolean(record.roleRecord?.isOwner) || record.role === "OWNER";
            const isEditing = editUserId === record.id;
            const currentRoleOption = roles.find((role) => role.id === record.roleId);
            const selectedRoleId =
              currentRoleOption?.id ??
              roles.find((role) => role.key === record.role)?.id ??
              roles.find((role) => role.key === "STAFF")?.id;

            return {
              id: record.id,
              searchText: `${record.name} ${record.email} ${roleLabel}`,
              sortValues: {
                name: record.name,
                role: roleLabel,
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
                role: roleLabel,
                lastLogin: record.lastLoginAt ? formatDate(record.lastLoginAt, localeString) : "-",
                createdAt: formatDate(record.createdAt, localeString),
              },
              actions: (
                <>
                  {canEdit && !isProtectedOwner ? (
                    isEditing ? (
                      <form action={updateUserRoleAction.bind(null, typedLocale, record.id)} className="flex flex-wrap justify-end gap-2">
                        <select
                          name="roleId"
                          defaultValue={selectedRoleId}
                          className="h-10 rounded-full border border-black/10 bg-white/90 px-3 text-sm text-[var(--color-foreground)]"
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button className={buttonClasses({ size: "sm", className: "gap-2" })}>
                          <Check className="h-4 w-4" />
                          {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                        </button>
                        <Link
                          href={usersHref(typedLocale, resolvedSearchParams)}
                          className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}
                        >
                          <X className="h-4 w-4" />
                          {typedLocale === "sq" ? "Anulo" : "Cancel"}
                        </Link>
                      </form>
                    ) : (
                      <Link
                        href={`${usersHref(typedLocale, resolvedSearchParams, record.id)}#${record.id}`}
                        className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}
                      >
                        <Pencil className="h-4 w-4" />
                        {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                      </Link>
                    )
                  ) : null}
                  {canDelete && record.id !== user.id && (!isProtectedOwner || currentUserIsOwner) ? (
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
                  ) : null}
                </>
              ),
            };
          })}
        />
      </Card>
    </div>
  );
}
