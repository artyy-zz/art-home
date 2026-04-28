import bcrypt from "bcryptjs";
import { FurnitureCategory, PrismaClient, UserRole } from "@prisma/client";

process.env.DATABASE_URL ??= "file:./prisma/dev.db";

const prisma = new PrismaClient();

const toCents = (amount: number) => Math.round(amount * 100);

const productSeeds = [
  {
    slug: "studio-oak-kitchen",
    nameSq: "Kuzhinë Noir Marble",
    nameEn: "Noir Marble Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë moderne me dizajn minimalist dhe tone të errëta elegante, e kombinuar me ndriçim ambienti dhe sipërfaqe mermeri për një pamje luksoze dhe funksionale.",
    summaryEn:
      "Modern kitchen with minimalist design and elegant dark tones, combined with ambient lighting and marble surfaces for a luxurious and functional look.",
    descriptionSq:
      "Kuzhinë moderne me dizajn minimalist dhe tone të errëta elegante, e kombinuar me ndriçim ambienti dhe sipërfaqe mermeri për një pamje luksoze dhe funksionale.",
    descriptionEn:
      "Modern kitchen with minimalist design and elegant dark tones, combined with ambient lighting and marble surfaces for a luxurious and functional look.",
    dimensions: "320 × 240 × 90 cm",
    materialNotesSq:
      "MDF i lyer mat, sipërfaqe mermeri, elemente druri natyral, xham i errët, ndriçim LED integruar",
    materialNotesEn:
      "Matte painted MDF, marble surface, natural wood elements, dark glass, integrated LED lighting",
    featured: true,
    basePriceCents: toCents(5400),
    laborCostCents: toCents(980),
    createdAt: new Date("2026-04-26T20:31:03.000Z"),
  },
  {
    slug: "arber-dining-table",
    nameSq: "Kuzhinë Elegant Linea",
    nameEn: "Elegant Linea Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë moderne me linja të pastra dhe kombinim harmonik të ngjyrave të lehta me elemente të errëta, e pasuruar me ndriçim dekorativ dhe hapësirë ngrënieje elegante.",
    summaryEn:
      "Modern kitchen with clean lines and a harmonious combination of light colors with dark elements, enriched with decorative lighting and an elegant dining space.",
    descriptionSq:
      "Kuzhinë moderne me linja të pastra dhe kombinim harmonik të ngjyrave të lehta me elemente të errëta, e pasuruar me ndriçim dekorativ dhe hapësirë ngrënieje elegante.",
    descriptionEn:
      "Modern kitchen with clean lines and a harmonious combination of light colors with dark elements, enriched with decorative lighting and an elegant dining space.",
    dimensions: "360 × 260 × 90 cm",
    materialNotesSq:
      "MDF i lyer me shkëlqim, sipërfaqe graniti, elemente metalike, xham i temperuar, ndriçim LED integruar",
    materialNotesEn:
      "Gloss painted MDF, granite surface, metal elements, tempered glass, integrated LED lighting",
    featured: true,
    basePriceCents: toCents(1480),
    laborCostCents: toCents(260),
    createdAt: new Date("2026-04-26T20:31:02.000Z"),
  },
  {
    slug: "linea-wardrobe",
    nameSq: "Kuzhinë Natural Wood Luxe",
    nameEn: "Natural Wood Luxe Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë elegante me dizajn natyral dhe tone të ngrohta druri, e kombinuar me detaje metalike dhe sipërfaqe mermeri për një ambient të sofistikuar dhe mikpritës.",
    summaryEn:
      "Elegant kitchen with a natural design and warm wood tones, combined with metal details and marble surfaces for a sophisticated and welcoming interior.",
    descriptionSq:
      "Kuzhinë elegante me dizajn natyral dhe tone të ngrohta druri, e kombinuar me detaje metalike dhe sipërfaqe mermeri për një ambient të sofistikuar dhe mikpritës.",
    descriptionEn:
      "Elegant kitchen with a natural design and warm wood tones, combined with metal details and marble surfaces for a sophisticated and welcoming interior.",
    dimensions: "340 × 250 × 90 cm",
    materialNotesSq:
      "Dru natyral ose MDF i veshur me furnir druri, sipërfaqe mermeri, elemente metalike në ngjyrë ari, pajisje premium",
    materialNotesEn:
      "Natural wood or wood veneer MDF, marble surface, gold-tone metal elements, premium appliances",
    featured: true,
    basePriceCents: toCents(3120),
    laborCostCents: toCents(620),
    createdAt: new Date("2026-04-26T20:31:01.000Z"),
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
  await prisma.purchaseInvoiceItem.deleteMany();
  await prisma.purchaseInvoice.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.offerItem.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.productBomItem.deleteMany();
  await prisma.material.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.supplier.deleteMany();
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
