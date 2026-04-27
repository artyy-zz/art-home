import bcrypt from "bcryptjs";
import { FurnitureCategory, PrismaClient, UserRole } from "@prisma/client";

process.env.DATABASE_URL ??= "file:./prisma/dev.db";

const prisma = new PrismaClient();

const toCents = (amount: number) => Math.round(amount * 100);

const productSeeds = [
  {
    slug: "studio-oak-kitchen",
    nameSq: "Kuzhinë Studio Oak",
    nameEn: "Studio Oak Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq: "Kuzhinë modulare me linja të pastra dhe organizim praktik.",
    summaryEn: "Modular kitchen with clean lines and practical organization.",
    descriptionSq:
      "Projektuar për apartamente dhe shtëpi moderne, me ruajtje të zgjuar, ndriçim të integruar dhe punim të saktë.",
    descriptionEn:
      "Designed for modern apartments and homes with smart storage, integrated lighting, and precise detailing.",
    dimensions: "Sipas projektit",
    materialNotesSq: "Lisi, panele cilësore dhe furnitura soft-close.",
    materialNotesEn: "Oak, quality panels, and soft-close hardware.",
    featured: true,
    basePriceCents: toCents(5400),
    laborCostCents: toCents(980),
  },
  {
    slug: "arber-dining-table",
    nameSq: "Tavolinë Arbër",
    nameEn: "Arber Dining Table",
    category: FurnitureCategory.TABLES,
    summarySq: "Tavolinë ngrënieje me sipërfaqe druri dhe bazë të qëndrueshme.",
    summaryEn: "Dining table with a wood surface and durable base.",
    descriptionSq:
      "Tavolinë e fortë dhe elegante për zona ngrënieje, me përmasa dhe përfundim sipas hapësirës.",
    descriptionEn:
      "A strong, elegant table for dining areas, with dimensions and finish adapted to the space.",
    dimensions: "Sipas projektit",
    materialNotesSq: "Dru cilësor, bazë metalike dhe llak mbrojtës.",
    materialNotesEn: "Quality wood, metal base, and protective lacquer.",
    featured: true,
    basePriceCents: toCents(1480),
    laborCostCents: toCents(260),
  },
  {
    slug: "linea-wardrobe",
    nameSq: "Garderobë Linea",
    nameEn: "Linea Wardrobe",
    category: FurnitureCategory.WARDROBES,
    summarySq: "Garderobë me organizim të brendshëm të personalizuar.",
    summaryEn: "Wardrobe with a personalized interior organization system.",
    descriptionSq:
      "Zgjidhje praktike për dhoma gjumi dhe korridore, me ndarje efikase dhe pamje të pastër.",
    descriptionEn:
      "A practical solution for bedrooms and corridors, with efficient compartments and a clean look.",
    dimensions: "Sipas projektit",
    materialNotesSq: "Panele cilësore, ndriçim opsional dhe mekanizma të qëndrueshëm.",
    materialNotesEn: "Quality panels, optional lighting, and durable mechanisms.",
    featured: true,
    basePriceCents: toCents(3120),
    laborCostCents: toCents(620),
  },
  {
    slug: "atelier-media-wall",
    nameSq: "Media Wall Atelier",
    nameEn: "Atelier Media Wall",
    category: FurnitureCategory.CUSTOM,
    summarySq: "Njësi murale për sallon me panele dekorative dhe ruajtje të fshehur.",
    summaryEn: "Living room media wall with decorative panels and hidden storage.",
    descriptionSq:
      "Sistem i personalizuar për ambiente moderne, me përzierje të drurit, ndriçimit dhe linjave të pastra.",
    descriptionEn:
      "A personalized system for modern spaces, blending wood tones, lighting, and clean lines.",
    dimensions: "Sipas projektit",
    materialNotesSq: "Dru, panele dekorative, LED opsional dhe aksesorë të zgjedhur.",
    materialNotesEn: "Wood, decorative panels, optional LEDs, and selected accessories.",
    featured: false,
    basePriceCents: toCents(4260),
    laborCostCents: toCents(840),
  },
];

async function main() {
  await prisma.inventoryMovement.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.offerItem.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.productBomItem.deleteMany();
  await prisma.material.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);

  await prisma.user.create({
    data: {
      name: "Art Home Owner",
      email: "owner@arthome.al",
      passwordHash: adminPasswordHash,
      role: UserRole.OWNER,
    },
  });

  await prisma.product.createMany({
    data: productSeeds,
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
