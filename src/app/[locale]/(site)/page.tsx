import Link from "next/link";
import { Card } from "@/components/shared/card";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonClasses } from "@/components/shared/button";
import { getFeaturedProducts } from "@/lib/erp";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getProductImage, siteImages } from "@/lib/site-images";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const dict = getDictionary(typedLocale);
  const featuredProducts = await getFeaturedProducts(typedLocale);

  return (
    <div className="animate-fade">
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
              <ComingSoonButton variant="primary" size="lg">
                {dict.common.requestQuote}
              </ComingSoonButton>
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
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden rounded-[30px]">
                <PlaceholderMedia
                  label={product.name}
                  src={getProductImage(product.slug, product.category)}
                />
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
                    {product.categoryTitle}
                  </p>
                  <h3 className="mt-3 break-words font-display text-2xl leading-none text-[var(--color-foreground)] sm:text-3xl">
                    {product.name}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
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
                <ComingSoonButton
                  variant="secondary"
                  size="lg"
                  className="!bg-white !text-[var(--color-panel)]"
                  messageClassName="text-white"
                >
                  {dict.common.requestQuote}
                </ComingSoonButton>
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
