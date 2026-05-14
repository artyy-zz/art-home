import { FurnitureCategory } from "@prisma/client";

export const COMPANY = {
  name: "Art Home",
  phone: "049/313/215",
  email: "mobileriaarthome@gmail.com",
  address: "PRISHTINË-FERIZAJ, 3",
  documents: {
    legalName: "Mobileria Art Home SH.P.K.",
    address: "PRISHTINË-FERIZAJ, 3",
    phone: "049/313/215",
    email: "mobileriaarthome@gmail.com",
    nui: null,
    vatNumber: null,
    bankAccounts: [
      "BPB: 1300001004256511",
    ],
  },
  instagram: "https://www.instagram.com/mobileria_arthome_/",
  instagramUsername: "@mobileria_arthome_",
  facebook: "https://www.facebook.com/profile.php?id=61574449680489",
  facebookUsername: "Mobileria Art Home",
} as const;

export const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1896.8206103520151!2d21.156797038976645!3d42.53455936923394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x13548300065c9bf1%3A0xe34b13a129ea1a1f!2sMobileria%20Art%20Home!5e1!3m2!1sen!2s!4v1778696599141!5m2!1sen!2s";

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
