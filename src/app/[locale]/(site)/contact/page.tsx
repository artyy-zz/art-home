import { Card } from "@/components/shared/card";
import { SectionHeading } from "@/components/shared/section-heading";
import { COMPANY, GOOGLE_MAPS_EMBED_URL } from "@/lib/company";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);

  const details = [
    {
      label: typedLocale === "sq" ? "Telefoni" : "Phone",
      value: COMPANY.phone,
      href: `tel:${COMPANY.phone.replace(/\s/g, "")}`,
    },
    {
      label: "Email",
      value: COMPANY.email,
      href: `mailto:${COMPANY.email}`,
    },
    {
      label: typedLocale === "sq" ? "Lokacioni" : "Location",
      value: COMPANY.address,
    },
  ];

  return (
    <div className="px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-7xl space-y-8">
        <SectionHeading title={dict.contact.title} description={dict.contact.intro} />
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-[26px] p-5 sm:p-7 md:rounded-[30px] md:p-9">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              {typedLocale === "sq" ? "Detajet e kontaktit" : "Contact details"}
            </p>
            <h1 className="mt-4 break-words font-display text-4xl leading-none text-[var(--color-foreground)] sm:text-5xl">
              {COMPANY.name}
            </h1>
            <div className="mt-8 space-y-5">
              {details.map((item) => (
                <div key={item.label}>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    {item.label}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="mt-2 inline-flex text-sm font-semibold text-[var(--color-foreground)] transition hover:text-[var(--color-accent-strong)]"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">
                      {item.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={COMPANY.instagram}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
              >
                Instagram
              </a>
              <a
                href={COMPANY.facebook}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-black/10 bg-white/85 px-5 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
              >
                Facebook
              </a>
            </div>
          </Card>
          <Card className="overflow-hidden rounded-[30px] p-2">
            <iframe
              title={typedLocale === "sq" ? "Harta e lokacionit Art Home" : "Art Home location map"}
              src={GOOGLE_MAPS_EMBED_URL}
              className="h-[340px] w-full rounded-[24px] border-0 sm:h-[440px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
