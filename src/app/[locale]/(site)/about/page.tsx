import type { Metadata } from "next";
import { Card } from "@/components/shared/card";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { SectionHeading } from "@/components/shared/section-heading";
import { getDictionary, locales, type Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { siteImages } from "@/lib/site-images";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata(locale as Locale, "about");
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);
  const craftPoints = [
    typedLocale === "sq" ? "Dizajn modern" : "Modern design",
    typedLocale === "sq" ? "Funksionalitet" : "Functionality",
    typedLocale === "sq" ? "Cilësi e qëndrueshme" : "Lasting quality",
    typedLocale === "sq" ? "Matje të sakta" : "Precise measurements",
    typedLocale === "sq" ? "Punim me porosi" : "Made-to-measure work",
    typedLocale === "sq" ? "Mbështetje profesionale" : "Professional support",
  ];

  return (
    <div className="px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeading
          headingLevel={1}
          title={dict.about.title}
          description={dict.about.intro}
        />
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[26px] p-5 sm:p-8 md:rounded-[32px]">
            <h2 className="break-words font-display text-3xl leading-none text-[var(--color-foreground)] sm:text-4xl">
              {dict.about.craftsmanshipTitle}
            </h2>
            <p className="mt-5 text-sm leading-8 text-[var(--color-muted)]">
              {dict.about.craftsmanshipBody}
            </p>
            <div className="mt-8 grid gap-x-8 gap-y-4 md:grid-cols-2">
              {craftPoints.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-sm font-medium leading-7 text-[var(--color-foreground)]"
                >
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
          <PlaceholderMedia
            label={typedLocale === "sq" ? "Punishtja Art Home" : "Art Home Workshop"}
            src={siteImages.about}
            overlayEyebrow={null}
            overlayLabel="ART HOME"
            className="min-h-[300px] sm:min-h-[360px] md:min-h-[420px]"
          />
        </div>
      </div>
    </div>
  );
}
