import Link from "next/link";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { buttonClasses } from "@/components/shared/button";
import { getDashboardSnapshot, statusTone } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

export default async function AdminDashboardPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  await requirePermission(typedLocale, "DASHBOARD", "VIEW");
  const snapshot = await getDashboardSnapshot(typedLocale);
  const localeString = snapshot.intlLocale;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: typedLocale === "sq" ? "Te ardhura mujore" : "Monthly revenue",
            value: formatCurrency(snapshot.kpis.monthlyRevenueCents, localeString),
          },
          {
            label: typedLocale === "sq" ? "Fitimi" : "Profit",
            value: formatCurrency(snapshot.kpis.monthlyProfitCents, localeString),
          },
          {
            label: typedLocale === "sq" ? "TVSH e mbledhur" : "VAT collected",
            value: formatCurrency(snapshot.kpis.monthlyVatCents, localeString),
          },
          {
            label: typedLocale === "sq" ? "Borxhe te hapura" : "Outstanding debt",
            value: formatCurrency(snapshot.kpis.outstandingDebtCents, localeString),
          },
        ].map((item) => (
          <Card key={item.label} className="rounded-[28px] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
              {item.label}
            </p>
            <p className="mt-4 font-display text-5xl leading-none text-[var(--color-foreground)]">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <DashboardCharts
        locale={typedLocale}
        revenueSeries={snapshot.revenueSeries}
        materialUsage={snapshot.materialUsage}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[30px] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
              {typedLocale === "sq" ? "Shitjet kryesore" : "Best-selling items"}
            </h2>
            <Link href={`/${typedLocale}/admin/reports`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {typedLocale === "sq" ? "Raportet" : "Reports"}
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {snapshot.kpis.bestSellingProducts.map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-[22px] border border-black/8 bg-white/75 px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {product.name}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {formatNumber(product.quantity, localeString)}{" "}
                    {typedLocale === "sq" ? "copë" : "pcs"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--color-accent-strong)]">
                  {formatCurrency(product.revenueCents, localeString)}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-[30px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Njoftime dhe alert-e" : "Notifications and alerts"}
          </h2>
          <div className="mt-6 space-y-4">
            {snapshot.notifications.map((notification) => (
              <div key={notification.id} className="rounded-[22px] border border-black/8 bg-white/75 p-4">
                <Badge tone="accent">{notification.type}</Badge>
                <p className="mt-3 font-semibold text-[var(--color-foreground)]">
                  {notification.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  {notification.message}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[30px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Fatura per ndjekje" : "Invoices to follow up"}
          </h2>
          <div className="mt-6 space-y-4">
            {snapshot.overdueInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-[22px] border border-black/8 bg-white/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {invoice.number}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">{invoice.client}</p>
                  </div>
                  <Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-[var(--color-muted)]">
                  <span>{formatDate(invoice.dueDate, localeString)}</span>
                  <span>{formatCurrency(invoice.outstandingCents, localeString)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[30px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Stok i ulet" : "Low stock"}
          </h2>
          <div className="mt-6 space-y-4">
            {snapshot.lowStockMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between rounded-[22px] border border-black/8 bg-white/75 px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {material.name}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {typedLocale === "sq" ? "Pragu" : "Threshold"}:{" "}
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
    </div>
  );
}
