import { FurnitureCategory } from "@prisma/client";

const toCents = (amount: number) => Math.round(amount * 100);

type ProductCatalogItem = {
  slug: string;
  imageSrc: string;
  nameSq: string;
  nameEn: string;
  category: FurnitureCategory;
  summarySq: string;
  summaryEn: string;
  descriptionSq: string;
  descriptionEn: string;
  dimensions: string | null;
  materialNotesSq: string;
  materialNotesEn: string;
  featured: boolean;
  basePriceCents: number;
  laborCostCents: number;
  createdAt: Date;
};

export const publicProductCatalog = [
  {
    slug: "stone-island-wine-kitchen",
    imageSrc: "/images/art-home/stone-island-kitchen.jpg",
    nameSq: "Kuzhinë Stone Island me vitrinë vere",
    nameEn: "Stone Island Kitchen with Wine Display",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë moderne me ishull guri, fronte të errëta dhe vitrinë vere me xham të zi e ndriçim të integruar.",
    summaryEn:
      "Modern kitchen with a stone island, dark fronts, and a black glass wine display with integrated lighting.",
    descriptionSq:
      "Ky projekt kombinon kuzhinën në formë L me një ishull qendror prej guri dhe një mur ekspozues për gota e verëra. Ndriçimi linear, xhami i errët dhe pajisjet e integruara krijojnë pamje të qetë dhe luksoze.",
    descriptionEn:
      "This project pairs an L-shaped kitchen with a central stone island and a display wall for glasses and wine. Linear lighting, dark glass, and integrated appliances create a calm, luxury look.",
    dimensions: null,
    materialNotesSq:
      "MDF mat, panel guri ose porcelani, xham i tymosur, profil alumini i zi, ndriçim LED.",
    materialNotesEn:
      "Matte MDF, stone or porcelain slab, smoked glass, black aluminum profile, LED lighting.",
    featured: true,
    basePriceCents: toCents(7600),
    laborCostCents: toCents(1420),
    createdAt: new Date("2026-04-27T20:31:14.000Z"),
  },
  {
    slug: "linea-wardrobe",
    imageSrc: "/images/art-home/walnut-wall-kitchen.jpg",
    nameSq: "Kuzhinë Linea me dru teksturë",
    nameEn: "Linea Textured Wood Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë lineare me dollapë të gjatë me teksturë druri, fronte të errëta të rrafshëta dhe ndriçim LED nën elementet e sipërme.",
    summaryEn:
      "Linear kitchen with tall textured wood cabinets, flat dark fronts, and LED lighting below the upper units.",
    descriptionSq:
      "Pamja e gjatë e murit e bën hapësirën të duket e rregullt dhe bashkëkohore. Fronte të zeza, panel muri me teksturë guri dhe ndriçim i fshehur e kthejnë kuzhinën në një zonë pune të pastër dhe elegante.",
    descriptionEn:
      "The long wall composition keeps the space orderly and contemporary. Black fronts, a textured stone-look backsplash, and hidden lighting turn the kitchen into a clean, elegant work zone.",
    dimensions: null,
    materialNotesSq:
      "MDF i zi mat, panele me teksturë druri, pllakë pune guri, mekanizma të fshehur, LED linear.",
    materialNotesEn:
      "Matte black MDF, textured wood panels, stone worktop, concealed hardware, linear LED.",
    featured: true,
    basePriceCents: toCents(6100),
    laborCostCents: toCents(1120),
    createdAt: new Date("2026-04-27T20:31:13.000Z"),
  },
  {
    slug: "classic-walnut-marble-kitchen",
    imageSrc: "/images/art-home/classic-wood-kitchen.jpg",
    nameSq: "Kuzhinë Walnut Marble Classic",
    nameEn: "Walnut Marble Classic Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë klasike me fronte arre, kapak oxhaku dekorativ, sipërfaqe mermeri dhe dollapë xhami për ekspozim.",
    summaryEn:
      "Classic kitchen with walnut fronts, a decorative hood cover, marble surfaces, and glass display cabinets.",
    descriptionSq:
      "Dizajni nxjerr në pah punimin e drurit, kornizat e thelluara dhe balancën mes ishullit, zonës së gatimit dhe vitrinave. Sipërfaqet e bardha me damarë gri e mbajnë ambientin të ndritshëm.",
    descriptionEn:
      "The design highlights wood craftsmanship, recessed frames, and a balanced layout between the island, cooking zone, and display cabinets. White veined surfaces keep the room bright.",
    dimensions: null,
    materialNotesSq:
      "Furnir arre ose MDF me dekor druri, kuarc/mermer, xham dekorativ, doreza të zeza metalike.",
    materialNotesEn:
      "Walnut veneer or wood-effect MDF, quartz/marble, decorative glass, black metal handles.",
    featured: true,
    basePriceCents: toCents(6900),
    laborCostCents: toCents(1280),
    createdAt: new Date("2026-04-27T20:31:12.000Z"),
  },
  {
    slug: "atelier-media-wall",
    imageSrc: "/images/art-home/custom-breakfast-corner.jpg",
    nameSq: "Kënd kompakt për mëngjes",
    nameEn: "Compact Breakfast Corner",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë e vogël me banak mëngjesi, rafte të hapura dhe tone të ngrohta druri për përdorim të përditshëm.",
    summaryEn:
      "Small kitchen with a breakfast counter, open shelving, and warm wood tones for everyday use.",
    descriptionSq:
      "E përshtatshme për apartamente ose hapësira më të ngushta, kjo zgjidhje përdor banakun si zonë pune dhe ulëse. Raftet e hapura, dollapët e integruar dhe ndriçimi varës e bëjnë ambientin praktik pa e rënduar.",
    descriptionEn:
      "Made for apartments or tighter spaces, this solution uses the counter as both worktop and seating. Open shelves, integrated cabinets, and pendant lighting keep the room practical without making it feel heavy.",
    dimensions: null,
    materialNotesSq:
      "MDF me dekor druri, sipërfaqe kompakte, rafte të hapura, aksesorë bronzi dhe ndriçim varës.",
    materialNotesEn:
      "Wood-effect MDF, compact worktop, open shelves, brass details, and pendant lighting.",
    featured: true,
    basePriceCents: toCents(3600),
    laborCostCents: toCents(720),
    createdAt: new Date("2026-04-27T20:31:11.000Z"),
  },
  {
    slug: "studio-oak-kitchen",
    imageSrc: "/images/art-home/dark-marble-kitchen.jpg",
    nameSq: "Kuzhinë Walnut Island",
    nameEn: "Walnut Island Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë në formë L me dollapë të errët, ishull me sipërfaqe të bardhë dhe elemente xhami me ndriçim.",
    summaryEn:
      "L-shaped kitchen with dark wood cabinetry, a white island surface, and lit glass-front elements.",
    descriptionSq:
      "Dollapët e sipërm me xham, ishulli qendror dhe ndriçimi i varur krijojnë një kuzhinë familjare me karakter klasik. Kontrasti mes drurit të errët dhe sipërfaqeve të bardha e mban hapësirën të pastër.",
    descriptionEn:
      "Glass-front upper cabinets, a central island, and pendant lighting create a family kitchen with classic character. The contrast between dark wood and white surfaces keeps the space crisp.",
    dimensions: null,
    materialNotesSq:
      "Dru i errët ose furnir arre, MDF i lyer, kuarc i bardhë, xham, doreza metalike, LED.",
    materialNotesEn:
      "Dark wood or walnut veneer, painted MDF, white quartz, glass, metal handles, LED.",
    featured: false,
    basePriceCents: toCents(5800),
    laborCostCents: toCents(1040),
    createdAt: new Date("2026-04-27T20:31:10.000Z"),
  },
  {
    slug: "black-heritage-kitchen",
    imageSrc: "/images/art-home/black-luxury-kitchen.jpg",
    nameSq: "Kuzhinë Black Heritage",
    nameEn: "Black Heritage Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë e zezë me korniza klasike, banak druri, ndriçim nën dollapë dhe detaje metali në ngjyrë ari.",
    summaryEn:
      "Black framed kitchen with a wood counter, under-cabinet lighting, and gold-tone metal details.",
    descriptionSq:
      "Frustrat e zeza me profil klasik dhe vitrinat e sipërme i japin kuzhinës pamje të thellë. Banaku i ngrohtë prej druri dhe ndriçimi i fshehur sjellin balancë mes luksit dhe përdorimit të përditshëm.",
    descriptionEn:
      "Black framed fronts and upper glass cabinets give the kitchen visual depth. The warm wood counter and concealed lighting balance a luxury mood with daily practicality.",
    dimensions: null,
    materialNotesSq:
      "MDF i zi me kornizë, banak druri, xham, doreza bronzi, panel muri me efekt guri.",
    materialNotesEn:
      "Black framed MDF, wood countertop, glass, brass handles, stone-effect wall panel.",
    featured: false,
    basePriceCents: toCents(5200),
    laborCostCents: toCents(960),
    createdAt: new Date("2026-04-27T20:31:09.000Z"),
  },
  {
    slug: "rustic-island-kitchen",
    imageSrc: "/images/art-home/compact-wood-kitchen.jpg",
    nameSq: "Kuzhinë Rustic Island",
    nameEn: "Rustic Island Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë me ishull druri, sipërfaqe të zezë, rafte të hapura dhe varëse industriale mbi zonën e punës.",
    summaryEn:
      "Wood island kitchen with a black surface, open shelving, and industrial pendants above the work zone.",
    descriptionSq:
      "Ishulli i madh, raftet anësore dhe kornizat klasike krijojnë ndjesi të ngrohtë shtëpie. Sipërfaqja e zezë dhe ndriçimi industrial shtojnë kontrast modern.",
    descriptionEn:
      "The large island, side shelving, and classic frames create a warm residential feel. The black surface and industrial lighting add modern contrast.",
    dimensions: null,
    materialNotesSq:
      "Dru masiv ose furnir, pllakë pune e zezë, rafte të hapura, doreza të zeza, ndriçim metalik.",
    materialNotesEn:
      "Solid wood or veneer, black worktop, open shelves, black handles, metal lighting.",
    featured: false,
    basePriceCents: toCents(6300),
    laborCostCents: toCents(1180),
    createdAt: new Date("2026-04-27T20:31:08.000Z"),
  },
  {
    slug: "galley-brass-kitchen",
    imageSrc: "/images/art-home/galley-wood-kitchen.jpg",
    nameSq: "Kuzhinë Galley me detaje bronzi",
    nameEn: "Galley Kitchen with Brass Details",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë galley me ishull mermeri, fronte të errëta, vitrinë druri dhe doreza bronzi.",
    summaryEn:
      "Galley kitchen with a marble island, dark fronts, a wood display cabinet, and brass handles.",
    descriptionSq:
      "Kompozimi i ngushtë shfrytëzon të dy anët e hapësirës: lavamani dhe zona e gatimit në njërën anë, ishulli i gjatë në tjetrën. Dorezat dhe rubinetet në bronz japin theks elegant.",
    descriptionEn:
      "The narrow composition uses both sides of the room: sink and cooking zone on one side, a long island on the other. Brass handles and faucets add an elegant accent.",
    dimensions: null,
    materialNotesSq:
      "MDF i lyer, furnir druri, mermer/kuarc i bardhë, xham, pajisje dhe doreza bronzi.",
    materialNotesEn:
      "Painted MDF, wood veneer, white marble/quartz, glass, brass hardware and handles.",
    featured: false,
    basePriceCents: toCents(6600),
    laborCostCents: toCents(1240),
    createdAt: new Date("2026-04-27T20:31:07.000Z"),
  },
  {
    slug: "oak-pantry-kitchen",
    imageSrc: "/images/art-home/oak-storage-kitchen.jpg",
    nameSq: "Kuzhinë Oak Pantry",
    nameEn: "Oak Pantry Kitchen",
    category: FurnitureCategory.KITCHENS,
    summarySq:
      "Kuzhinë me dollapë të lartë druri, ishull të bardhë, panel mermeri dhe aksesorë në ngjyrë ari.",
    summaryEn:
      "Kitchen with tall wood cabinets, a white island, marble wall panel, and gold-tone accessories.",
    descriptionSq:
      "Dollapët e gjatë krijojnë shumë hapësirë ruajtjeje, ndërsa xhami dekorativ dhe detajet metalike e bëjnë murin funksional edhe vizual. Ishulli i bardhë sjell dritë në mes të kompozimit.",
    descriptionEn:
      "Tall cabinets create generous storage, while decorative glass and metal details make the wall both functional and visual. The white island brings brightness to the composition.",
    dimensions: null,
    materialNotesSq:
      "Furnir lisi ose arre, mermer/kuarc i bardhë, xham, profil ari, mekanizma të integruar.",
    materialNotesEn:
      "Oak or walnut veneer, white marble/quartz, glass, gold profile, integrated hardware.",
    featured: false,
    basePriceCents: toCents(7000),
    laborCostCents: toCents(1320),
    createdAt: new Date("2026-04-27T20:31:06.000Z"),
  },
  {
    slug: "arber-dining-table",
    imageSrc: "/images/art-home/open-plan-dining-kitchen.jpg",
    nameSq: "Ambient ngrënieje Stone Suite",
    nameEn: "Stone Suite Dining Room",
    category: FurnitureCategory.TABLES,
    summarySq:
      "Ambient ngrënieje me tavolinë guri, karrige të veshura, vitrinë qelqi dhe panele muri me teksturë.",
    summaryEn:
      "Dining room with a stone table, upholstered chairs, a glass display cabinet, and textured wall panels.",
    descriptionSq:
      "Tavolina qendrore me sipërfaqe guri lidhet me vitrinën e pasme dhe ndriçimin dekorativ. Kompozimi është menduar për zona të hapura ku ngrënia, ekspozimi dhe kuzhina qëndrojnë bashkë.",
    descriptionEn:
      "The central stone table connects with the rear display cabinet and decorative lighting. The composition is designed for open areas where dining, display, and kitchen zones sit together.",
    dimensions: null,
    materialNotesSq:
      "Sipërfaqe guri, bazë metalike, karrige të tapicuara, xham i pastër, panele muri me teksturë.",
    materialNotesEn:
      "Stone surface, metal base, upholstered chairs, clear glass, textured wall panels.",
    featured: true,
    basePriceCents: toCents(4800),
    laborCostCents: toCents(760),
    createdAt: new Date("2026-04-27T20:31:05.000Z"),
  },
  {
    slug: "wine-wall-dining-room",
    imageSrc: "/images/art-home/dining-wardrobe-wall.jpg",
    nameSq: "Sallë ngrënieje me wine wall",
    nameEn: "Dining Room with Wine Wall",
    category: FurnitureCategory.TABLES,
    summarySq:
      "Tavolinë e zezë ngrënieje me karrige të veshura, mur vere me xham dhe rafte të ndriçuara.",
    summaryEn:
      "Black dining table with upholstered chairs, a glass wine wall, and illuminated shelving.",
    descriptionSq:
      "Muri i verës me xham të errët punon si sfond për tavolinën dhe krijon një zonë elegante mikpritjeje. Ndriçimi i integruar thekson raftet, ndërsa karriget e buta e bëjnë ambientin të rehatshëm.",
    descriptionEn:
      "The dark glass wine wall works as a backdrop for the table and creates an elegant hosting zone. Integrated lighting highlights the shelves, while soft chairs keep the room comfortable.",
    dimensions: null,
    materialNotesSq:
      "Tavolinë me sipërfaqe të zezë, xham i tymosur, raft metalik, LED të ngrohtë, karrige të tapicuara.",
    materialNotesEn:
      "Black tabletop, smoked glass, metal shelving, warm LEDs, upholstered chairs.",
    featured: false,
    basePriceCents: toCents(5400),
    laborCostCents: toCents(820),
    createdAt: new Date("2026-04-27T20:31:04.000Z"),
  },
  {
    slug: "dark-dining-wall",
    imageSrc: "/images/art-home/industrial-dark-kitchen.jpg",
    nameSq: "Ambient ngrënieje Dark Wall",
    nameEn: "Dark Wall Dining Area",
    category: FurnitureCategory.TABLES,
    summarySq:
      "Tavolinë ngrënieje me mur druri të errët, panel herringbone dhe ndriçim varës mbi zonën e uljes.",
    summaryEn:
      "Dining table with a dark wood wall, herringbone paneling, and pendant lights above the seating area.",
    descriptionSq:
      "Ky ambient përdor sipërfaqe të errëta dhe tekstura të thella për një ndjesi të qetë e moderne. Banaku i ulët përgjatë murit shton ruajtje dhe vend për dekor pa zënë hapësirë.",
    descriptionEn:
      "This setting uses dark surfaces and deep textures for a calm, modern mood. The low wall unit adds storage and display space without crowding the room.",
    dimensions: null,
    materialNotesSq:
      "Pllakë druri e errët, panel herringbone, bazë metalike tavoline, karrige të zeza, ndriçim varës.",
    materialNotesEn:
      "Dark wood slab, herringbone panel, metal table base, black chairs, pendant lighting.",
    featured: false,
    basePriceCents: toCents(3900),
    laborCostCents: toCents(620),
    createdAt: new Date("2026-04-27T20:31:03.000Z"),
  },
  {
    slug: "arched-living-room",
    imageSrc: "/images/art-home/living-room-showcase.jpg",
    nameSq: "Sallon me rafte harkore",
    nameEn: "Living Room with Arched Shelving",
    category: FurnitureCategory.CUSTOM,
    summarySq:
      "Sallon i ngrohtë me divan të ulët, rafte të integruara në hark dhe tavolinë qendrore me forma të buta.",
    summaryEn:
      "Warm living room with a low sofa, integrated arched shelving, and a soft-shaped central table.",
    descriptionSq:
      "Raftet në të dy anët e sallonit krijojnë organizim dhe dekor, ndërsa sofa neutrale dhe ndriçimi i fshehur sjellin atmosferë të qetë. Kjo është zgjidhje e plotë për sallon dhe hapësira hoteliere.",
    descriptionEn:
      "Shelving on both sides of the room creates storage and display, while the neutral sofa and hidden lighting bring a calm atmosphere. It works as a full solution for living rooms and hospitality spaces.",
    dimensions: null,
    materialNotesSq:
      "Rafte të integruara me dekor druri, MDF i lyer, tavolinë qendrore, ndriçim indirekt, tapiceri neutrale.",
    materialNotesEn:
      "Integrated wood-effect shelving, painted MDF, central table, indirect lighting, neutral upholstery.",
    featured: true,
    basePriceCents: toCents(6200),
    laborCostCents: toCents(1060),
    createdAt: new Date("2026-04-27T20:31:02.000Z"),
  },
  {
    slug: "low-lounge-suite",
    imageSrc: "/images/art-home/lounge-workshop-showcase.jpg",
    nameSq: "Low Lounge Suite",
    nameEn: "Low Lounge Suite",
    category: FurnitureCategory.CUSTOM,
    summarySq:
      "Sallon lounge me divan modular të ulët, bazë druri dhe tavolinë qendrore me teksturë natyrale.",
    summaryEn:
      "Lounge setting with a low modular sofa, wood base, and a central table with natural texture.",
    descriptionSq:
      "Divani i ulët dhe tavolina me dru natyral krijojnë ambient të qetë për pushim. Forma modulare lejon përshtatje sipas dhomës, ndërsa tonet neutrale e mbajnë hapësirën të butë.",
    descriptionEn:
      "The low sofa and natural wood table create a calm resting area. The modular shape adapts to the room, while neutral tones keep the space soft.",
    dimensions: null,
    materialNotesSq:
      "Bazë druri, tapiceri tekstili, jastëkë modularë, tavolinë druri natyral, qilim neutral.",
    materialNotesEn:
      "Wood base, textile upholstery, modular cushions, natural wood table, neutral rug.",
    featured: false,
    basePriceCents: toCents(4400),
    laborCostCents: toCents(780),
    createdAt: new Date("2026-04-27T20:31:01.000Z"),
  },
] as const satisfies ReadonlyArray<ProductCatalogItem>;

export const publicProductSeeds = publicProductCatalog.map((product) => ({
  slug: product.slug,
  nameSq: product.nameSq,
  nameEn: product.nameEn,
  category: product.category,
  summarySq: product.summarySq,
  summaryEn: product.summaryEn,
  descriptionSq: product.descriptionSq,
  descriptionEn: product.descriptionEn,
  dimensions: product.dimensions,
  materialNotesSq: product.materialNotesSq,
  materialNotesEn: product.materialNotesEn,
  featured: product.featured,
  basePriceCents: product.basePriceCents,
  laborCostCents: product.laborCostCents,
  createdAt: product.createdAt,
}));
