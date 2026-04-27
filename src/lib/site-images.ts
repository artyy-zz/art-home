import type { FurnitureCategory } from "@prisma/client";

export const siteImages = {
  hero: "/images/art-home/living-room-showcase.jpg",
  about: "/images/art-home/lounge-workshop-showcase.jpg",
} as const;

const productImages: Record<string, string> = {
  "studio-oak-kitchen": "/images/art-home/stone-island-kitchen.jpg",
  "arber-dining-table": "/images/art-home/dining-wardrobe-wall.jpg",
  "linea-wardrobe": "/images/art-home/oak-storage-kitchen.jpg",
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
