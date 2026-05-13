import { Card } from "@/components/shared/card";
import { SectionHeading } from "@/components/shared/section-heading";
import { COMPANY, GOOGLE_MAPS_EMBED_URL } from "@/lib/company";
import { getDictionary, type Locale } from "@/lib/i18n";

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="currentColor"
    >
      <path d="M14.3 8.1h2.2V4.3c-.4-.1-1.7-.2-3.2-.2-3.2 0-5.4 2-5.4 5.6v3.1H4.4V17h3.5v7h4.3v-7h3.4l.5-4.2h-3.9V10c0-1.2.3-1.9 2.1-1.9Z" />
    </svg>
  );
}

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
            <div className="mt-8 grid gap-3">
              <a
                href={COMPANY.instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/90 px-5 py-3 text-sm font-semibold text-[var(--color-foreground)] shadow-[0_12px_28px_rgba(18,16,14,0.08)] transition hover:-translate-y-0.5 hover:border-[#d62976] hover:bg-white hover:text-[#b31560]"
              >
                <InstagramIcon />
                <span>{COMPANY.instagramUsername}</span>
              </a>
              <a
                href={COMPANY.facebook}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/90 px-5 py-3 text-sm font-semibold text-[var(--color-foreground)] shadow-[0_12px_28px_rgba(18,16,14,0.08)] transition hover:-translate-y-0.5 hover:border-[#1877f2] hover:bg-white hover:text-[#1877f2]"
              >
                <FacebookIcon />
                <span>{COMPANY.facebookUsername}</span>
              </a>
            </div>
          </Card>
          <Card className="overflow-hidden rounded-[30px] p-2">
            <iframe
              title={typedLocale === "sq" ? "Harta e lokacionit Art Home" : "Art Home location map"}
              src={GOOGLE_MAPS_EMBED_URL}
              className="h-[340px] w-full rounded-[24px] border-0 sm:h-[440px]"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
