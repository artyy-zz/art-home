import { Card } from "@/components/shared/card";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { SectionHeading } from "@/components/shared/section-heading";
import { getPublicProducts } from "@/lib/erp";
import type { Locale } from "@/lib/i18n";
import { getProductImage } from "@/lib/site-images";

export default async function FurniturePage({
  params,
}: PageProps<"/[locale]/furniture">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const products = await getPublicProducts(typedLocale);

  return (
    <div className="px-6 py-14 md:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
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
          {products.map((product) => (
            <Card
              key={product.id}
              className="grid overflow-hidden rounded-[32px] lg:grid-cols-[0.95fr_1.05fr]"
            >
              <PlaceholderMedia
                label={product.name}
                src={getProductImage(product.slug, product.category)}
                className="min-h-[300px]"
              />
              <div className="p-6 md:p-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
                    {product.categoryTitle}
                  </p>
                  <h2 className="mt-3 font-display text-4xl leading-none text-[var(--color-foreground)]">
                    {product.name}
                  </h2>
                </div>
                <p className="mt-5 text-sm leading-7 text-[var(--color-muted)]">
                  {product.description}
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-black/8 bg-white/76 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Përmasa" : "Dimensions"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-foreground)]">
                      {product.dimensions ||
                        (typedLocale === "sq" ? "Sipas projektit" : "Project specific")}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-black/8 bg-white/76 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      {typedLocale === "sq" ? "Materiale" : "Materials"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-foreground)]">
                      {product.materialNotes || product.categoryBody}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
