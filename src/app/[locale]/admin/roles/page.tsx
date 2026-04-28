import { updateUserPermissionsAction } from "@/actions/admin";
import { buttonClasses } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import {
  ensureSystemRoles,
  getPermissionMatrixForRoleRecord,
  getUserPermissionMatrix,
  requireOwner,
} from "@/lib/permissions";
import {
  permissionActionLabels,
  permissionActions,
  permissionModuleLabels,
  permissionModules,
  roleLabels,
  type PermissionMatrix,
} from "@/lib/permissions-config";
import { prisma } from "@/lib/prisma";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";

const checkboxClassName = "h-4 w-4 accent-[var(--color-accent-strong)]";

function permissionStats(matrix: PermissionMatrix) {
  let allowed = 0;
  const total = permissionModules.length * permissionActions.length;

  for (const permissionModule of permissionModules) {
    for (const action of permissionActions) {
      if (matrix[permissionModule][action]) {
        allowed += 1;
      }
    }
  }

  return { allowed, total };
}

function PermissionChecklist({
  locale,
  matrix,
  locked = false,
}: {
  locale: Locale;
  matrix: PermissionMatrix;
  locked?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {permissionModules.map((permissionModule) => (
        <div key={permissionModule} className="rounded-2xl border border-black/8 bg-white/72 p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(170px,0.75fr)_1.7fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {permissionModuleLabels[permissionModule][locale]}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {permissionModuleLabels[permissionModule][locale === "sq" ? "en" : "sq"]}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {permissionActions.map((action) => (
                <label
                  key={action}
                  className="flex min-h-10 items-center gap-2 rounded-full border border-black/8 bg-white/78 px-3 text-xs font-medium text-[var(--color-foreground)]"
                >
                  <input
                    type="checkbox"
                    name={`${permissionModule}:${action}`}
                    defaultChecked={locked || matrix[permissionModule][action]}
                    disabled={locked}
                    className={checkboxClassName}
                  />
                  <span>{permissionActionLabels[action][locale]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ))}
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
    where: { isSystem: true },
    select: {
      id: true,
      key: true,
      name: true,
      isOwner: true,
      isSystem: true,
    },
    orderBy: [{ isOwner: "desc" }, { name: "asc" }],
  });

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
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
    },
  });

  const roleMatrices = new Map(
    await Promise.all(
      roles.map(async (role) => [
        role.id,
        await getPermissionMatrixForRoleRecord(role),
      ] as const),
    ),
  );

  const userMatrices = new Map(
    await Promise.all(
      users.map(async (person) => [
        person.id,
        await getUserPermissionMatrix(person),
      ] as const),
    ),
  );

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
              {typedLocale === "sq" ? "Rolet & Lejet" : "Roles & Permissions"}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
              {typedLocale === "sq"
                ? "Rolet vendosin shabllonin fillestar; lejet finale ruhen për çdo përdorues."
                : "Roles set the starting template; final permissions are saved per user."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#1e1a16] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
            <ShieldCheck className="h-4 w-4" />
            Owner only
          </span>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {roles.map((role) => {
          const matrix = roleMatrices.get(role.id);
          if (!matrix) {
            return null;
          }

          const stats = permissionStats(matrix);

          return (
            <div key={role.id} className="rounded-2xl border border-black/8 bg-white/82 p-4">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">{role.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                {stats.allowed}/{stats.total} {typedLocale === "sq" ? "leje" : "permissions"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {users.map((person) => {
          const matrix = userMatrices.get(person.id);
          if (!matrix) {
            return null;
          }

          const stats = permissionStats(matrix);
          const isOwner = Boolean(person.roleRecord?.isOwner) || person.role === "OWNER";
          const roleLabel = person.roleRecord?.name ?? roleLabels[person.role][typedLocale];

          return (
            <details
              key={person.id}
              className="group overflow-hidden rounded-2xl border border-black/8 bg-white/86 shadow-[0_14px_36px_rgba(18,16,14,0.06)]"
            >
              <summary className="grid cursor-pointer list-none gap-3 p-4 text-left transition hover:bg-white md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center [&::-webkit-details-marker]:hidden">
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">{person.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{person.email}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-strong)]">
                    {roleLabel}
                  </span>
                  <span className="rounded-full bg-[#f4f0ea] px-3 py-1.5 text-xs font-semibold text-[#5a4b40]">
                    {stats.allowed}/{stats.total} {typedLocale === "sq" ? "leje" : "permissions"}
                  </span>
                </div>
                <ChevronDown className="h-5 w-5 justify-self-end text-[var(--color-muted)] transition group-open:rotate-180" />
              </summary>

              <div className="border-t border-black/8 p-4">
                {isOwner ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-black/8 bg-[#f7f2ec] p-4 text-sm font-medium text-[var(--color-foreground)]">
                      {typedLocale === "sq"
                        ? "Owner ka gjithmonë qasje të plotë dhe nuk mund të humbasë lejet."
                        : "Owner always has full access and cannot lose permissions."}
                    </div>
                    <PermissionChecklist locale={typedLocale} matrix={matrix} locked />
                  </div>
                ) : (
                  <form action={updateUserPermissionsAction.bind(null, typedLocale, person.id)} className="space-y-4">
                    <PermissionChecklist locale={typedLocale} matrix={matrix} />
                    <button className={buttonClasses({ className: "gap-2" })}>
                      <Check className="h-4 w-4" />
                      {typedLocale === "sq" ? "Ndrysho" : "Edit"}
                    </button>
                  </form>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
