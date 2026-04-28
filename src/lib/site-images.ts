import type { FurnitureCategory } from "@prisma/client";

export const siteImages = {
  hero: "/images/art-home/hero-kitchen.jpg",
  about: "/images/art-home/about-workshop.jpg",
} as const;

const productImages: Record<string, string> = {
  "studio-oak-kitchen": "/images/art-home/dark-marble-kitchen.jpg",
  "arber-dining-table": "/images/art-home/open-plan-dining-kitchen.jpg",
  "linea-wardrobe": "/images/art-home/walnut-wall-kitchen.jpg",
  "atelier-media-wall": "/images/art-home/custom-breakfast-corner.jpg",
};

const categoryImages: Record<FurnitureCategory, string> = {
  KITCHENS: "/images/art-home/classic-wood-kitchen.jpg",
  TABLES: "/images/art-home/dining-wardrobe-wall.jpg",
  WARDROBES: "/images/art-home/oak-storage-kitchen.jpg",
  CUSTOM: "/images/art-home/custom-breakfast-corner.jpg",
};

export function getProductImage(slug: string, category: FurnitureCategory) {
  return productImages[slug] ?? categoryImages[category];
}
