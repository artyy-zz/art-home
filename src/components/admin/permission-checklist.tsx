import {
  permissionActionLabels,
  permissionActions,
  permissionModuleLabels,
  permissionModules,
  type PermissionMatrix,
} from "@/lib/permissions-config";
import type { Locale } from "@/lib/i18n";

export const checkboxClassName = "h-4 w-4 accent-[var(--color-accent-strong)]";

export const visiblePermissionModules = permissionModules;

export function permissionStats(matrix: PermissionMatrix) {
  let enabled = 0;
  let total = 0;

  for (const permissionModule of visiblePermissionModules) {
    for (const action of permissionActions) {
      total += 1;
      if (matrix[permissionModule][action]) {
        enabled += 1;
      }
    }
  }

  return { enabled, total };
}

export function createEmptyPermissionMatrix() {
  return Object.fromEntries(
    permissionModules.map((permissionModule) => [
      permissionModule,
      Object.fromEntries(permissionActions.map((action) => [action, false])),
    ]),
  ) as PermissionMatrix;
}

export function PermissionChecklist({
  locale,
  matrix,
  locked = false,
}: {
  locale: Locale;
  matrix: PermissionMatrix;
  locked?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/10">
      <table className="min-w-full divide-y divide-black/10 text-sm">
        <thead className="bg-black/[0.03]">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">
              {locale === "sq" ? "Seksioni" : "Section"}
            </th>
            {permissionActions.map((action) => (
              <th key={action} className="px-4 py-3 text-center font-semibold">
                {permissionActionLabels[action][locale]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          {visiblePermissionModules.map((permissionModule) => (
            <tr key={permissionModule}>
              <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                {permissionModuleLabels[permissionModule][locale]}
              </td>
              {permissionActions.map((action) => (
                <td key={action} className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    name={`${permissionModule}:${action}`}
                    defaultChecked={locked || matrix[permissionModule][action]}
                    disabled={locked}
                    className={checkboxClassName}
                    aria-label={`${permissionModuleLabels[permissionModule][locale]} ${permissionActionLabels[action][locale]}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
