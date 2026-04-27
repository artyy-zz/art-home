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
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeading title={dict.about.title} description={dict.about.intro} />
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[32px] p-8">
            <h2 className="font-display text-4xl leading-none text-[var(--color-foreground)]">
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
            className="min-h-[420px]"
          />
        </div>
      </div>
    </div>
  );
}
