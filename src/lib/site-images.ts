import type { FurnitureCategory } from "@prisma/client";
import { publicProductCatalog } from "@/data/product-catalog";

export const siteImages = {
  hero: "/images/art-home/hero-kitchen.jpg",
  about: "/images/art-home/about-workshop.jpg",
} as const;

const productImages = Object.fromEntries(
  publicProductCatalog.map((product) => [product.slug, product.imageSrc]),
) as Record<string, string>;

const categoryImages: Record<FurnitureCategory, string> = {
  KITCHENS: "/images/mobiljet/mobilje-3.jpg",
  TABLES: "/images/mobiljet/mobilje-11.jpg",
  WARDROBES: "/images/mobiljet/mobilje-9.jpg",
  CUSTOM: "/images/mobiljet/mobilje-4.jpg",
};

export function getProductImage(slug: string, category: FurnitureCategory) {
  return productImages[slug] ?? categoryImages[category];
}
