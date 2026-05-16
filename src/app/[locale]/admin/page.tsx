import { withPagePerf } from "@/lib/perf";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronDown, X } from "lucide-react";
import { deleteNotificationAction } from "@/actions/admin";
import { DashboardChartsLoader } from "@/components/admin/dashboard-charts-loader";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { buttonClasses } from "@/components/shared/button";
import {
  getDashboardDetailSnapshot,
  getDashboardKpiSnapshot,
  statusTone,
} from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { measureDetailSync } from "@/lib/perf";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

function notificationGroupLabel(type: string, locale: Locale) {
  if (type === "LEAD") {
    return locale === "sq" ? "Kërkesat" : "Requests";
  }

  if (type === "LOW_STOCK") {
    return locale === "sq" ? "Inventari" : "Inventory";
  }

  if (type === "UNPAID_INVOICE") {
    return locale === "sq" ? "Faturat" : "Invoices";
  }

  if (type === "SYSTEM") {
    return locale === "sq" ? "Sistemi" : "System";
  }

  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function notificationGroupTone(type: string) {
  if (type === "LOW_STOCK") {
    return "warning" as const;
  }

  if (type === "UNPAID_INVOICE") {
    return "danger" as const;
  }

  if (type === "LEAD") {
    return "accent" as const;
  }

  return "neutral" as const;
}

async function AdminDashboardPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "DASHBOARD", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const canDeleteNotifications = can(permissions, "DASHBOARD", "DELETE");

  return measureDetailSync(
    "admin/dashboard.table mapping/formatting",
    () => (
    <div className="space-y-6">
      <Suspense fallback={<DashboardKpiSkeleton />}>
        <DashboardKpiCards locale={typedLocale} />
      </Suspense>

      <Suspense fallback={<DashboardDeferredSkeleton />}>
        <DashboardDeferredSections
          locale={typedLocale}
          canDeleteNotifications={canDeleteNotifications}
        />
      </Suspense>
    </div>
    ),
    { locale: typedLocale },
  );
}

function DashboardKpiSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="panel-card rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
          <div className="h-3 w-28 animate-pulse rounded-full bg-black/10" />
          <div className="mt-5 h-12 w-36 animate-pulse rounded-2xl bg-black/10" />
        </div>
      ))}
    </div>
  );
}

async function DashboardKpiCards({ locale }: { locale: Locale }) {
  const snapshot = await getDashboardKpiSnapshot(locale);
  const localeString = snapshot.intlLocale;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        {
          label: locale === "sq" ? "Te ardhura mujore" : "Monthly revenue",
          value: formatCurrency(snapshot.kpis.monthlyRevenueCents, localeString),
        },
        {
          label: locale === "sq" ? "Fitimi" : "Profit",
          value: formatCurrency(snapshot.kpis.monthlyProfitCents, localeString),
        },
        {
          label: locale === "sq" ? "TVSH e mbledhur" : "VAT collected",
          value: formatCurrency(snapshot.kpis.monthlyVatCents, localeString),
        },
        {
          label: locale === "sq" ? "Borxhe te hapura" : "Outstanding debt",
          value: formatCurrency(snapshot.kpis.outstandingDebtCents, localeString),
        },
      ].map((item) => (
        <Card key={item.label} className="rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
            {item.label}
          </p>
          <p className="mt-4 break-words font-display text-3xl leading-none text-[var(--color-foreground)] sm:text-5xl">
            {item.value}
          </p>
        </Card>
      ))}
    </div>
  );
}

function DashboardDeferredSkeleton() {
  return (
    <div className="space-y-6">
      <div className="panel-card h-80 animate-pulse rounded-[24px] bg-black/10 sm:rounded-[30px]" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel-card h-72 animate-pulse rounded-[24px] bg-black/10 sm:rounded-[30px]" />
        <div className="panel-card h-72 animate-pulse rounded-[24px] bg-black/10 sm:rounded-[30px]" />
      </div>
    </div>
  );
}

async function DashboardDeferredSections({
  locale,
  canDeleteNotifications,
}: {
  locale: Locale;
  canDeleteNotifications: boolean;
}) {
  const snapshot = await getDashboardDetailSnapshot(locale);
  const localeString = snapshot.intlLocale;
  const notificationGroups = Array.from(
    snapshot.notifications.reduce(
      (groups, notification) => {
        const current = groups.get(notification.type) ?? [];
        current.push(notification);
        groups.set(notification.type, current);
        return groups;
      },
      new Map<string, typeof snapshot.notifications>(),
    ),
  );

  return (
    <>
      <DashboardChartsLoader
        locale={locale}
        revenueSeries={snapshot.revenueSeries}
        materialUsage={snapshot.materialUsage}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
              {locale === "sq" ? "Shitjet kryesore" : "Best-selling items"}
            </h2>
            <Link href={`/${locale}/admin/reports`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {locale === "sq" ? "Raportet" : "Reports"}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {snapshot.bestSellingProducts.map((product) => (
              <div
                key={product.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-[2.25px] border-black/18 bg-white/75 px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {product.name}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {formatNumber(product.quantity, localeString)}{" "}
                    {locale === "sq" ? "copë" : "pcs"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--color-accent-strong)]">
                  {formatCurrency(product.revenueCents, localeString)}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
          <h2 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
            {locale === "sq" ? "Njoftime dhe alert-e" : "Notifications and alerts"}
          </h2>
          <div className="mt-6 space-y-4">
            {notificationGroups.map(([type, notifications]) => (
              <details
                key={type}
                open
                className="group overflow-hidden rounded-[22px] border-[2.25px] border-black/18 bg-white/75"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge tone={notificationGroupTone(type)}>
                      {notificationGroupLabel(type, locale)}
                    </Badge>
                    <span className="text-sm font-semibold text-[var(--color-foreground)]">
                      {notifications.length}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-black/10 px-3 pb-3 pt-2">
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="relative rounded-[18px] border border-black/10 bg-white/80 p-4 pr-11"
                      >
                        {canDeleteNotifications ? (
                          <form
                            action={deleteNotificationAction.bind(null, locale, notification.id)}
                            className="absolute right-3 top-3"
                          >
                            <button
                              type="submit"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(140,47,43,0.22)] bg-[rgba(140,47,43,0.08)] text-[var(--color-danger)] transition hover:bg-[var(--color-danger)] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(140,47,43,0.18)]"
                              aria-label={
                                locale === "sq"
                                  ? "Fshi njoftimin"
                                  : "Delete notification"
                              }
                              title={
                                locale === "sq"
                                  ? "Fshi njoftimin"
                                  : "Delete notification"
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        ) : null}
                        <p className="font-semibold text-[var(--color-foreground)]">
                          {notification.title}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                          {notification.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
          <h2 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
            {locale === "sq" ? "Fatura per ndjekje" : "Invoices to follow up"}
          </h2>
          <div className="mt-6 space-y-4">
            {snapshot.overdueInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-[22px] border-[2.25px] border-black/18 bg-white/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {invoice.number}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">{invoice.client}</p>
                  </div>
                  <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-muted)]">
                  <span>{formatDate(invoice.dueDate, localeString)}</span>
                  <span>{formatCurrency(invoice.outstandingCents, localeString)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
          <h2 className="font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
            {locale === "sq" ? "Stok i ulet" : "Low stock"}
          </h2>
          <div className="mt-6 space-y-4">
            {snapshot.lowStockMaterials.map((material) => (
              <div
                key={material.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-[2.25px] border-black/18 bg-white/75 px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {material.name}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {locale === "sq" ? "Pragu" : "Threshold"}:{" "}
                    {formatNumber(material.lowStockThreshold, localeString)}
                  </p>
                </div>
                <Badge tone="warning">
                  {formatNumber(material.stockQuantity, localeString)} {material.unit}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

export default withPagePerf("admin/dashboard", AdminDashboardPage);
