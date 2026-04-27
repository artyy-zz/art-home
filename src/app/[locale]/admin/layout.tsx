import { logoutAction } from "@/actions/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Button } from "@/components/shared/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { requireAdminSession } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getUserPermissionMatrix, isOwnerUser, visibleModulesFromMatrix } from "@/lib/permissions";
import { roleLabels } from "@/lib/permissions-config";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);
  const user = await requireAdminSession(typedLocale);
  const permissions = await getUserPermissionMatrix(user);
  const visibleModules = visibleModulesFromMatrix(permissions).filter(
    (module) => module !== "ROLES" || isOwnerUser(user),
  );
  const roleLabel = user.roleRecord?.name ?? roleLabels[user.role][typedLocale];

  return (
    <div className="min-h-screen bg-[#140f0c] px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <AdminSidebar
          locale={typedLocale}
          visibleModules={visibleModules}
          userName={user.name}
          roleLabel={roleLabel}
        />
        <div className="min-w-0 flex-1">
          <div className="panel-card mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[30px] px-6 py-5">
            <div>
              <h1 className="font-display text-4xl leading-none text-white">
                {dict.admin.insights}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
