import { Card } from "@/components/shared/card";
import { COMPANY } from "@/lib/company";
import type { Locale } from "@/lib/i18n";
import { requirePermission } from "@/lib/permissions";

export default async function SettingsPage({
  params,
}: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  await requirePermission(typedLocale, "SETTINGS", "VIEW");

  return (
    <Card className="rounded-[28px] p-6">
      <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
        {typedLocale === "sq" ? "Cilësimet" : "Settings"}
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [typedLocale === "sq" ? "Biznesi" : "Business", COMPANY.name],
          ["Email", COMPANY.email],
          [typedLocale === "sq" ? "Telefoni" : "Phone", COMPANY.phone],
          [typedLocale === "sq" ? "Adresa" : "Address", COMPANY.address],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[20px] border border-black/8 bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {label}
            </p>
            <p className="mt-2 font-semibold text-[var(--color-foreground)]">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
