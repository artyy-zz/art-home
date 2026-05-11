import { logoutAction } from "@/actions/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Button } from "@/components/shared/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { requireAdminSession } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";
import { measureDetailAsync, measureDetailSync } from "@/lib/perf";
import { getUserPermissionMatrix, visibleModulesFromMatrix } from "@/lib/permissions";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await measureDetailAsync(
    "admin/layout.i18n/locale loading",
    () => params,
  );
  const typedLocale = locale as Locale;
  const dict = measureDetailSync(
    "admin/layout.i18n/dictionary loading",
    () => getDictionary(typedLocale),
    { locale: typedLocale },
  );
  const user = await measureDetailAsync(
    "admin/layout.auth/session",
    () => requireAdminSession(typedLocale),
    { locale: typedLocale },
  );
  const permissions = await measureDetailAsync(
    "admin/layout.permissions",
    () => getUserPermissionMatrix(user),
    { locale: typedLocale, userId: user.id },
  );
  const { visibleModules, roleLabel } = measureDetailSync(
    "admin/layout.layout/sidebar work",
    () => {
      const modules = visibleModulesFromMatrix(permissions);

      return {
        visibleModules: modules,
        roleLabel: typedLocale === "sq" ? "Perdorues" : "User",
      };
    },
    { locale: typedLocale, userId: user.id },
  );

  return (
    <div className="min-h-screen bg-[#140f0c] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:gap-6">
        <AdminSidebar
          locale={typedLocale}
          visibleModules={visibleModules}
          userName={user.name}
          roleLabel={roleLabel}
        />
        <div data-admin-content className="min-w-0 flex-1">
          <div className="panel-card mb-4 flex flex-col items-start justify-between gap-4 rounded-[24px] px-4 py-4 sm:flex-row sm:items-center sm:px-5 md:mb-6 lg:rounded-[30px] lg:px-6 lg:py-5">
            <div>
              <h1 className="font-display text-2xl leading-none text-white sm:text-3xl lg:text-4xl">
                {dict.admin.insights}
              </h1>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
              <LanguageSwitcher locale={typedLocale} labels="full" inverse />
              <form action={logoutAction.bind(null, typedLocale)}>
                <Button variant="secondary" className="!bg-white !text-[var(--color-panel)]">
                  {dict.common.logout}
                </Button>
              </form>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
