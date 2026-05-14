"use client";

import type { MouseEvent } from "react";
import {
  permissionActionLabels,
  permissionActions,
  permissionModuleLabels,
  visiblePermissionModules,
  type PermissionMatrix,
} from "@/lib/permissions-config";
import type { Locale } from "@/lib/i18n";

export const checkboxClassName = "h-4 w-4 accent-[var(--color-accent-strong)]";

export function PermissionChecklist({
  locale,
  matrix,
  locked = false,
}: {
  locale: Locale;
  matrix: PermissionMatrix;
  locked?: boolean;
}) {
  function selectSection(event: MouseEvent<HTMLButtonElement>) {
    const row = event.currentTarget.closest("tr");
    const inputs = row?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not(:disabled)');
    inputs?.forEach((input) => {
      input.checked = true;
    });
  }

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
                <button
                  type="button"
                  onClick={selectSection}
                  disabled={locked}
                  className="rounded-full px-2 py-1 text-left transition hover:bg-[var(--color-accent-soft)] disabled:cursor-default disabled:hover:bg-transparent"
                  title={locale === "sq" ? "Selekto te gjitha lejet e ketij seksioni" : "Select all permissions in this section"}
                >
                  {permissionModuleLabels[permissionModule][locale]}
                </button>
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
