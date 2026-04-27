import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import {
  ensureSystemRoles,
  getPermissionMatrixForRoleRecord,
  requireOwner,
} from "@/lib/permissions";
import {
  permissionActionLabels,
  permissionActions,
  permissionModuleLabels,
  permissionModules,
} from "@/lib/permissions-config";
import { prisma } from "@/lib/prisma";

const inputClassName =
  "w-full rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)] read-only:bg-[#f6efe6]";

function PermissionGrid({
  locale,
  matrix,
  locked = false,
}: {
  locale: Locale;
  matrix?: Awaited<ReturnType<typeof getPermissionMatrixForRoleRecord>>;
  locked?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-black/8 bg-white/82">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-[#eee5da] text-xs uppercase tracking-[0.18em] text-[#5a4b40]">
            <tr>
              <th className="px-4 py-4">Module</th>
              {permissionActions.map((action) => (
                <th key={action} className="px-4 py-4 text-center">
                  {permissionActionLabels[action][locale]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/8">
            {permissionModules.map((module) => (
              <tr key={module} className="bg-white/55">
                <td className="px-4 py-4">
                  <p className="font-medium text-[var(--color-foreground)]">
                    {permissionModuleLabels[module].sq}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {permissionModuleLabels[module].en}
                  </p>
                </td>
                {permissionActions.map((action) => (
                  <td key={action} className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      name={`${module}:${action}`}
                      defaultChecked={locked || Boolean(matrix?.[module][action])}
                      disabled={locked}
                      className="h-5 w-5 accent-[var(--color-accent-strong)]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function RolesPage({
  params,
}: PageProps<"/[locale]/admin/roles">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  await requireOwner(typedLocale);
  await ensureSystemRoles();

  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: [{ isOwner: "desc" }, { isSystem: "desc" }, { name: "asc" }],
  });

  const matrices = new Map(
    await Promise.all(
      roles.map(async (role) => [
        role.id,
        await getPermissionMatrixForRoleRecord(role),
      ] as const),
    ),
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
              {typedLocale === "sq" ? "Rolet & Lejet" : "Roles & Permissions"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
              {typedLocale === "sq"
                ? "Menaxhoni rolet, përshkrimet dhe lejet për çdo modul të ERP-së."
                : "Manage roles, descriptions, and permissions for every ERP module."}
            </p>
          </div>
          <span className="rounded-full bg-[#1e1a16] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
            Owner only
          </span>
        </div>
      </Card>

      <Card className="rounded-[28px] p-6">
        <h3 className="font-display text-2xl leading-none text-[var(--color-foreground)]">
          {typedLocale === "sq" ? "Krijo rol" : "Create role"}
        </h3>
        <form action={createRoleAction.bind(null, typedLocale)} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
            <input
              name="name"
              required
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Emri i rolit" : "Role name"}
            />
            <input
              name="description"
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Përshkrimi" : "Description"}
            />
          </div>
          <PermissionGrid locale={typedLocale} />
          <button className={buttonClasses({})}>
            {typedLocale === "sq" ? "Krijo rol" : "Create role"}
          </button>
        </form>
      </Card>

      {roles.map((role) => {
        const matrix = matrices.get(role.id);
        const isLocked = role.isOwner;
        const canDelete = !role.isSystem && !role.isOwner && role._count.users === 0;

        return (
          <Card key={role.id} className="rounded-[28px] p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl leading-none text-[var(--color-foreground)]">
                  {role.name}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {role.isOwner
                    ? typedLocale === "sq"
                      ? "Rol i mbrojtur me qasje të plotë."
                      : "Protected role with full access."
                    : role.isSystem
                      ? typedLocale === "sq"
                        ? "Rol bazë i sistemit."
                        : "Core system role."
                      : typedLocale === "sq"
                        ? "Rol i personalizuar."
                        : "Custom role."}
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
                {role._count.users} {typedLocale === "sq" ? "përdorues" : "users"}
              </span>
            </div>

            <form action={updateRoleAction.bind(null, typedLocale, role.id)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                <input
                  name="name"
                  required
                  readOnly={role.isSystem}
                  defaultValue={role.name}
                  className={inputClassName}
                />
                <input
                  name="description"
                  readOnly={isLocked}
                  defaultValue={role.description ?? ""}
                  className={inputClassName}
                  placeholder={typedLocale === "sq" ? "Përshkrimi" : "Description"}
                />
              </div>
              <PermissionGrid locale={typedLocale} matrix={matrix} locked={isLocked} />
              {!isLocked ? (
                <div className="flex flex-wrap gap-3">
                  <button className={buttonClasses({})}>
                    {typedLocale === "sq" ? "Ruaj rolin" : "Save role"}
                  </button>
                </div>
              ) : null}
            </form>

            {canDelete ? (
              <form action={deleteRoleAction.bind(null, typedLocale, role.id)} className="mt-4">
                <button className={buttonClasses({ variant: "danger" })}>
                  {typedLocale === "sq" ? "Fshi rol" : "Delete role"}
                </button>
              </form>
            ) : !role.isOwner && !role.isSystem ? (
              <p className="mt-4 text-sm text-[var(--color-muted)]">
                {typedLocale === "sq"
                  ? "Ky rol nuk mund të fshihet derisa ka përdorues të caktuar."
                  : "This role cannot be deleted while users are assigned to it."}
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
