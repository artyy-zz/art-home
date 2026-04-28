import { createUserAction, deleteUserAction, updateUserRoleAction } from "@/actions/admin";
import { RecordTable } from "@/components/admin/record-table";
import { PasswordInput } from "@/components/forms/password-input";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import { can, getAssignableRoles, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Check, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

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

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card className="rounded-[28px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Shto përdorues" : "Add user"}
          </h2>
          <form action={createUserAction.bind(null, typedLocale)} className="mt-6 grid gap-4 md:grid-cols-4">
            <input name="name" required className={inputClassName} placeholder={typedLocale === "sq" ? "Emri" : "Name"} />
            <input name="email" required type="email" className={inputClassName} placeholder="Email" />
            <PasswordInput className={inputClassName} placeholder={typedLocale === "sq" ? "Fjalëkalimi" : "Password"} buttonClassName="hover:bg-black/5" />
            <select name="roleId" defaultValue={roles.find((role) => role.key === "STAFF")?.id} className={inputClassName}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button className={buttonClasses({ className: "md:col-span-4 md:w-fit" })}>
              {typedLocale === "sq" ? "Ruaj përdoruesin" : "Save user"}
            </button>
          </form>
        </Card>
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
                  {canDelete && record.id !== user.id && !isProtectedOwner ? (
                    <form action={deleteUserAction.bind(null, typedLocale, record.id)}>
                      <button className={buttonClasses({ variant: "danger", size: "sm", className: "gap-2" })}>
                        <Trash2 className="h-4 w-4" />
                        {typedLocale === "sq" ? "Fshi" : "Delete"}
                      </button>
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
