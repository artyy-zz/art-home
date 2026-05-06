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
  KITCHENS: "/images/art-home/classic-wood-kitchen.jpg",
  TABLES: "/images/art-home/dining-wardrobe-wall.jpg",
  WARDROBES: "/images/art-home/oak-storage-kitchen.jpg",
  CUSTOM: "/images/art-home/custom-breakfast-corner.jpg",
};

export function getProductImage(slug: string, category: FurnitureCategory) {
  return productImages[slug] ?? categoryImages[category];
}
