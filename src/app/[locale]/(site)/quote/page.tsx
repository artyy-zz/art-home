import { QuoteForm } from "@/components/forms/quote-form";
import { Card } from "@/components/shared/card";
import { SectionHeading } from "@/components/shared/section-heading";
import { COMPANY } from "@/lib/company";
import type { Locale } from "@/lib/i18n";

export default async function QuoteRequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  return (
    <div className="px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-7xl space-y-8">
        <SectionHeading
          label={typedLocale === "sq" ? "Ofertë" : "Quote"}
          title={typedLocale === "sq" ? "Kërko Ofertë" : "Request a Quote"}
          description={
            typedLocale === "sq"
              ? "Përshkruani idenë, hapësirën ose mobiljen që dëshironi dhe ekipi ynë do ta shqyrtojë kërkesën."
              : "Describe the idea, space, or furniture you need and our team will review the request."
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[26px] p-5 sm:p-7 md:rounded-[30px] md:p-9">
            <QuoteForm locale={typedLocale} />
          </Card>

          <Card className="industrial-grid rounded-[26px] p-5 sm:p-7 md:rounded-[30px] md:p-9">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              {typedLocale === "sq" ? "Kontakt direkt" : "Direct contact"}
            </p>
            <h2 className="mt-4 break-words font-display text-4xl leading-none text-[var(--color-foreground)] sm:text-5xl">
              Art Home
            </h2>
            <div className="mt-8 grid gap-5 text-sm text-[var(--color-muted)]">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">
                  {typedLocale === "sq" ? "Telefoni" : "Phone"}
                </p>
                <a
                  href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                  className="mt-2 inline-flex font-semibold text-[var(--color-foreground)] transition hover:text-[var(--color-accent-strong)]"
                >
                  {COMPANY.phone}
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">Email</p>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="mt-2 inline-flex break-all font-semibold text-[var(--color-foreground)] transition hover:text-[var(--color-accent-strong)]"
                >
                  {COMPANY.email}
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">
                  {typedLocale === "sq" ? "Lokacioni" : "Location"}
                </p>
                <p className="mt-2 font-semibold text-[var(--color-foreground)]">
                  {COMPANY.address}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
