import { Card } from "@/components/shared/card";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { SectionHeading } from "@/components/shared/section-heading";
import { getDictionary, type Locale } from "@/lib/i18n";
import { siteImages } from "@/lib/site-images";

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);

  return (
    <div className="px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeading title={dict.about.title} description={dict.about.intro} />
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[26px] p-5 sm:p-8 md:rounded-[32px]">
            <h2 className="break-words font-display text-3xl leading-none text-[var(--color-foreground)] sm:text-4xl">
              {dict.about.craftsmanshipTitle}
            </h2>
            <p className="mt-5 text-sm leading-8 text-[var(--color-muted)]">
              {dict.about.craftsmanshipBody}
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                typedLocale === "sq" ? "Dizajn modern" : "Modern design",
                typedLocale === "sq" ? "Funksionalitet" : "Functionality",
                typedLocale === "sq" ? "Cilësi e qëndrueshme" : "Lasting quality",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-black/8 bg-white/72 p-4 text-sm text-[var(--color-foreground)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
          <PlaceholderMedia
            label={typedLocale === "sq" ? "Punishtja Art Home" : "Art Home Workshop"}
            src={siteImages.about}
            className="min-h-[300px] sm:min-h-[360px] md:min-h-[420px]"
          />
        </div>
      </div>
    </div>
  );
}
