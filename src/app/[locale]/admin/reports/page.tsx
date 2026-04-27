import { Card } from "@/components/shared/card";
import { ReportsCharts } from "@/components/admin/reports-charts";
import { getReportsSnapshot } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { requirePermission } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function ReportsPage({
  params,
}: PageProps<"/[locale]/admin/reports">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  await requirePermission(typedLocale, "REPORTS", "VIEW");
  const reports = await getReportsSnapshot(typedLocale);
  const localeString = typedLocale === "sq" ? "sq-AL" : "en-GB";

  return (
    <div className="space-y-6">
      <ReportsCharts locale={typedLocale} margins={reports.productMargins} debts={reports.clientDebt} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[30px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Fitimi per produkt" : "Profit per product"}
          </h2>
          <div className="mt-6 space-y-4">
            {reports.profitByProduct.slice(0, 6).map((product) => (
              <div key={product.name} className="flex items-center justify-between rounded-[22px] border border-black/8 bg-white/75 px-4 py-4">
                <div>
                  <p className="font-semibold text-[var(--color-foreground)]">{product.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {formatNumber(product.quantity, localeString)}{" "}
                    {typedLocale === "sq" ? "copë" : "pcs"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--color-accent-strong)]">
                  {formatCurrency(product.profitCents, localeString)}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-[30px] p-6">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Perdorimi i materialit" : "Material usage"}
          </h2>
          <div className="mt-6 space-y-4">
            {reports.materialUsage.slice(0, 6).map((material) => (
              <div key={material.name} className="flex items-center justify-between rounded-[22px] border border-black/8 bg-white/75 px-4 py-4">
                <p className="font-semibold text-[var(--color-foreground)]">{material.name}</p>
                <span className="text-sm text-[var(--color-muted)]">
                  {formatNumber(material.quantity, localeString)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="rounded-[30px] p-6">
        <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
          {typedLocale === "sq" ? "Borxhi sipas klientit" : "Client debt overview"}
        </h2>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {reports.clientDebt.map((client) => (
            <div key={client.id} className="rounded-[22px] border border-black/8 bg-white/75 px-4 py-4">
              <p className="font-semibold text-[var(--color-foreground)]">{client.name}</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {formatCurrency(client.outstandingDebtCents, localeString)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
