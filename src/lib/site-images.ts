import type { FurnitureCategory } from "@prisma/client";
import { publicProductCatalog } from "@/data/product-catalog";

export const siteImages = {
  hero: "/images/art-home/hero-kitchen.avif",
  about: "/images/art-home/about-workshop.avif",
} as const;

function imageLookupKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const productImages = Object.fromEntries(
  publicProductCatalog.flatMap((product) => [
    [imageLookupKey(product.slug), product.imageSrc],
    [imageLookupKey(product.nameSq), product.imageSrc],
    [imageLookupKey(product.nameEn), product.imageSrc],
  ]),
) as Record<string, string>;

const categoryImages: Record<FurnitureCategory, string> = {
  KITCHENS: "/images/mobiljet/mobilje-3.avif",
  TABLES: "/images/mobiljet/mobilje-11.avif",
  WARDROBES: "/images/mobiljet/mobilje-9.avif",
  CUSTOM: "/images/mobiljet/mobilje-4.avif",
};

export function getProductImage(
  slug: string,
  category: FurnitureCategory,
  name?: string,
) {
  return (
    productImages[imageLookupKey(slug)] ??
    (name ? productImages[imageLookupKey(name)] : undefined) ??
    categoryImages[category]
  );
}
