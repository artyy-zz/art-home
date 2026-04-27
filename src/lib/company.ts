import { FurnitureCategory } from "@prisma/client";

export const COMPANY = {
  name: "Art Home",
  phone: "+383 49 313 215",
  email: "bujar.bela@artnet-ks.com",
  address: "Lipjan, Kosovo",
  instagram: "https://www.instagram.com/mobileria_arthome_/",
  facebook: "https://www.facebook.com/profile.php?id=61574449680489",
} as const;

export const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps?q=42.5345611747001,21.158200586085872&z=16&output=embed";

export const categoryCopy: Record<
  FurnitureCategory,
  { titleSq: string; titleEn: string; bodySq: string; bodyEn: string }
> = {
  KITCHENS: {
    titleSq: "Kuzhina",
    titleEn: "Kitchens",
    bodySq:
      "Kompozime funksionale me ruajtje inteligjente, sipërfaqe cilësore dhe detaje të pastra.",
    bodyEn:
      "Functional compositions with intelligent storage, quality surfaces, and clean detailing.",
  },
  TABLES: {
    titleSq: "Tavolina",
    titleEn: "Tables",
    bodySq:
      "Tavolina ngrënieje dhe pune me kombinim të drurit të ngrohtë dhe bazave të qëndrueshme.",
    bodyEn:
      "Dining and work tables pairing warm wood with durable foundations.",
  },
  WARDROBES: {
    titleSq: "Garderoba",
    titleEn: "Wardrobes",
    bodySq:
      "Sisteme të personalizuara me dyer praktike, ndriçim dhe organizim efikas.",
    bodyEn:
      "Custom systems with practical doors, integrated lighting, and efficient organization.",
  },
  CUSTOM: {
    titleSq: "Mobilje me porosi",
    titleEn: "Made-to-measure furniture",
    bodySq:
      "Zgjidhje unike për sallone, hotele, zyra dhe projekte të tjera biznesi.",
    bodyEn:
      "Unique solutions for living rooms, hotels, offices, and other business projects.",
  },
};
