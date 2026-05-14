import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/shared/card";
import { LightboxImage } from "@/components/shared/lightbox-image";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonClasses } from "@/components/shared/button";
import { getPublicProducts } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { getProductImage } from "@/lib/site-images";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/furniture">): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata(locale as Locale, "furniture");
}

export default async function FurniturePage({
  params,
}: PageProps<"/[locale]/furniture">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const products = await getPublicProducts(typedLocale);
  const productPhotos = products.map((product) => ({
    src: getProductImage(product.slug, product.category, product.name),
    label: product.name,
  }));

  return (
    <div className="px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          headingLevel={1}
          label={typedLocale === "sq" ? "Koleksioni" : "Collection"}
          title={
            typedLocale === "sq"
              ? "Mobilje dhe sisteme me porosi"
              : "Made-to-measure furniture systems"
          }
          description={
            typedLocale === "sq"
              ? "Katalogu paraqet kategori dhe zgjidhje që mund të përshtaten sipas hapësirës tuaj."
              : "The catalog presents categories and solutions that can be adapted to your space."
          }
        />
        <div className="mt-10 grid gap-6">
          {products.map((product, index) => (
            <Card
              key={product.id}
              className="grid overflow-hidden rounded-[26px] md:rounded-[32px] lg:grid-cols-[0.95fr_1.05fr]"
            >
              <LightboxImage
                photos={productPhotos}
                index={index}
                overlayEyebrow="Art Home"
                className="min-h-[240px] rounded-[26px] sm:min-h-[300px] md:rounded-[32px]"
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
              <div className="p-5 sm:p-6 md:p-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
                    {product.categoryTitle}
                  </p>
                  <h2 className="mt-3 break-words font-display text-3xl leading-none text-[var(--color-foreground)] sm:text-4xl">
                    {product.name}
                  </h2>
                </div>
                <p className="mt-5 text-sm leading-7 text-[var(--color-muted)]">
                  {product.description}
                </p>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-[24px] border border-black/8 bg-white/76 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Materiale" : "Materials"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-foreground)]">
                      {product.materialNotes || product.categoryBody}
                    </p>
                  </div>
                  <Link
                    href={`/${typedLocale}/quote`}
                    className={buttonClasses({
                      variant: "secondary",
                      size: "sm",
                      className: "w-fit",
                    })}
                  >
                    {typedLocale === "sq" ? "Kërko ofertë" : "Request a quote"}
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
