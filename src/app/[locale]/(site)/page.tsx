import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/shared/card";
import { LightboxImage } from "@/components/shared/lightbox-image";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { QuoteSuccessToastFromQuery } from "@/components/shared/quote-success-toast";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonClasses } from "@/components/shared/button";
import { getFeaturedProducts } from "@/lib/erp";
import { getDictionary, locales, type Locale } from "@/lib/i18n";
import { getProductImage, siteImages } from "@/lib/site-images";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata(locale as Locale, "home");
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function HomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);
  const featuredProducts = await getFeaturedProducts(typedLocale);
  const featuredPhotos = featuredProducts.map((product) => ({
    src: getProductImage(product.slug, product.category, product.name),
    label: product.name,
  }));

  return (
    <div className="animate-fade">
      <Suspense fallback={null}>
        <QuoteSuccessToastFromQuery locale={typedLocale} />
      </Suspense>
      <section className="px-4 pb-10 pt-8 sm:px-6 md:px-10 md:pb-20 md:pt-10">
        <div className="mx-auto grid max-w-7xl min-w-0 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="industrial-grid relative min-w-0 overflow-hidden rounded-[28px] px-5 py-7 sm:px-7 sm:py-8 md:rounded-[36px] md:px-10 md:py-12">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
              {dict.home.eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl break-words font-display text-4xl leading-none text-[var(--color-foreground)] sm:text-5xl md:text-7xl">
              {dict.home.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-muted)] md:text-lg">
              {dict.home.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${typedLocale}/quote`}
                className={buttonClasses({ variant: "primary", size: "lg" })}
              >
                {dict.common.requestQuote}
              </Link>
              <Link
                href={`/${typedLocale}/furniture`}
                className={buttonClasses({ variant: "secondary", size: "lg" })}
              >
                {dict.common.exploreCollection}
              </Link>
            </div>
            <div className="mt-12 h-7" aria-hidden="true" />
          </Card>
            <PlaceholderMedia
            label={typedLocale === "sq" ? "Kuzhina Art Home" : "Art Home Kitchens"}
            src={siteImages.hero}
            priority
            className="h-full min-h-[300px] min-w-0 sm:min-h-[360px] md:min-h-[420px]"
          />
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 md:px-10 md:py-18">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            label="Art Home"
            title={dict.home.featuredTitle}
            description={
              typedLocale === "sq"
                ? "Kategori të menduara për banesa dhe projekte të personalizuara."
                : "Categories designed for homes and personalized interior projects."
            }
          />
          <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product, index) => (
              <Card
                key={product.id}
                className="overflow-hidden rounded-[30px] transition duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_30px_80px_rgba(18,16,14,0.2)]"
              >
                <LightboxImage
                  photos={featuredPhotos}
                  index={index}
                  className="min-h-[290px] rounded-[30px] sm:min-h-[340px] xl:min-h-[360px]"
                  sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                />
                <div className="p-6">
                  <p className="text-sm leading-7 text-[var(--color-muted)]">
                    {product.summary}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 pt-8 sm:px-6 md:px-10 md:pb-18 md:pt-10">
        <div className="mx-auto max-w-7xl">
          <Card tone="dark" className="overflow-hidden rounded-[28px] p-5 sm:p-8 md:rounded-[36px] md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-white/55">
                  {typedLocale === "sq" ? "Proces i qartë" : "Clear workflow"}
                </p>
                <h2 className="mt-4 break-words font-display text-4xl leading-none text-white md:text-6xl">
                  {dict.home.ctaTitle}
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-white/74">
                  {dict.home.ctaBody}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link
                  href={`/${typedLocale}/quote`}
                  className={buttonClasses({
                    variant: "secondary",
                    size: "lg",
                    className: "!bg-white !text-[var(--color-panel)]",
                  })}
                >
                  {dict.common.requestQuote}
                </Link>
                <Link
                  href={`/${typedLocale}/about`}
                  className={buttonClasses({
                    variant: "ghost",
                    size: "lg",
                    className: "text-white hover:bg-white/8",
                  })}
                >
                  {dict.common.learnMore}
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
