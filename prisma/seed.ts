import bcrypt from "bcryptjs";
import {
  DebitNoteReason,
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExpenseCategory,
  InvoiceStatus,
  LeadStatus,
  MaterialType,
  OfferStatus,
  PrismaClient,
  Unit,
  UserRole,
} from "@prisma/client";
import { publicProductSeeds } from "../src/data/product-catalog";

process.env.DATABASE_URL ??= "file:./prisma/dev.db";

const prisma = new PrismaClient();
const year = new Date().getFullYear();

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function totals(subtotalCents: number, vatEnabled = true, vatRate = 18) {
  const vatAmountCents = vatEnabled ? Math.round((subtotalCents * vatRate) / 100) : 0;

  return {
    subtotalCents,
    vatEnabled,
    vatRate,
    vatAmountCents,
    totalCents: subtotalCents + vatAmountCents,
  };
}

function amountPaidFor(status: InvoiceStatus, totalCents: number, partialCents = 0) {
  if (status === InvoiceStatus.PAID) {
    return totalCents;
  }

  if (status === InvoiceStatus.PARTIAL) {
    return Math.min(partialCents, totalCents);
  }

  return 0;
}

async function main() {
  await prisma.workerAdvance.deleteMany();
  await prisma.workerTimeEntry.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.assetInventory.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.debitNoteItem.deleteMany();
  await prisma.debitNote.deleteMany();
  await prisma.deliveryNoteItem.deleteMany();
  await prisma.deliveryNote.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.purchaseInvoiceItem.deleteMany();
  await prisma.purchaseInvoice.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.offerItem.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.stokArtikull.deleteMany();
  await prisma.stok.deleteMany();
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
    data: publicProductSeeds,
  });

  const clients = await Promise.all(
    [
      {
        name: "Prishtina Residence",
        contactPerson: "Arben Krasniqi",
        email: "arben@prishtina-residence.com",
        phone: "+383 44 100 101",
        address: "Rr. B, Prishtine",
        nui: "811100101",
        vatNumber: "330100101",
        notes: "Projekt banesor me kuzhina dhe dollape sipas porosise.",
      },
      {
        name: "Villa Dardania",
        contactPerson: "Elira Hoxha",
        email: "elira@villadardania.com",
        phone: "+383 44 100 102",
        address: "Dardani, Prishtine",
        nui: "811100102",
        vatNumber: "330100102",
        notes: "Klient privat per mobilim te plote te katit perdhese.",
      },
      {
        name: "Hotel Alba",
        contactPerson: "Blerim Gashi",
        email: "procurement@hotelalba.com",
        phone: "+383 44 100 103",
        address: "Sheshi Nena Tereze, Prishtine",
        nui: "811100103",
        vatNumber: "330100103",
        notes: "Mobilim recepsioni, dhoma dhe salle takimesh.",
      },
      {
        name: "Studio Liria",
        contactPerson: "Mira Berisha",
        email: "mira@studioliria.com",
        phone: "+383 44 100 104",
        address: "Rr. Luan Haradinaj, Prishtine",
        nui: "811100104",
        vatNumber: "330100104",
        notes: "Porosi periodike per projekte interieri.",
      },
      {
        name: "Caffe Teatri",
        contactPerson: "Driton Morina",
        email: "office@caffeteatri.com",
        phone: "+383 44 100 105",
        address: "Qendra, Prizren",
        nui: "811100105",
        vatNumber: "330100105",
        notes: "Banak, tavolina dhe rafte ekspozimi.",
      },
    ].map((data) => prisma.client.create({ data })),
  );

  const suppliers = await Promise.all(
    [
      {
        name: "Euro Wood Supply",
        contactPerson: "Mentor Shala",
        email: "sales@eurowood.example",
        phone: "+383 45 200 101",
        address: "Zona Industriale, Fushe Kosove",
        nui: "822200101",
        vatNumber: "440200101",
        notes: "Pllaka MDF, melamine dhe furnizime druri.",
      },
      {
        name: "Blum Partner Kosova",
        contactPerson: "Nora Rexhepi",
        email: "orders@blumpartner.example",
        phone: "+383 45 200 102",
        address: "Rr. Industriale, Prishtine",
        nui: "822200102",
        vatNumber: "440200102",
        notes: "Mekanizma, shina dhe mentesha premium.",
      },
      {
        name: "Stone & Surface",
        contactPerson: "Artan Mehmeti",
        email: "info@stonesurface.example",
        phone: "+383 45 200 103",
        address: "Vetri, Lipjan",
        nui: "822200103",
        vatNumber: "440200103",
        notes: "Pllaka pune guri dhe porcelani.",
      },
      {
        name: "Color Finish",
        contactPerson: "Teuta Ibrahimi",
        email: "paint@colorfinish.example",
        phone: "+383 45 200 104",
        address: "Rr. Tirana, Peje",
        nui: "822200104",
        vatNumber: "440200104",
        notes: "Llak, boje dhe materiale per finalizim.",
      },
      {
        name: "LED Line",
        contactPerson: "Fisnik Osmani",
        email: "support@ledline.example",
        phone: "+383 45 200 105",
        address: "Rr. Agim Ramadani, Prishtine",
        nui: "822200105",
        vatNumber: "440200105",
        notes: "Profile alumini, shirita LED dhe transformator.",
      },
    ].map((data) => prisma.supplier.create({ data })),
  );

  await prisma.lead.createMany({
    data: [
      {
        name: "Kuzhine per apartament te ri",
        phone: "+383 49 300 101",
        email: "lead1@example.com",
        description: "Kerkohet kuzhine moderne me ishull dhe ndricim LED.",
        status: LeadStatus.NEW,
        clientId: clients[0].id,
      },
      {
        name: "Dollap dhome gjumi",
        phone: "+383 49 300 102",
        email: "lead2@example.com",
        description: "Dollap me dyer rreshqitese dhe pasqyre.",
        status: LeadStatus.CONTACTED,
        clientId: clients[1].id,
      },
      {
        name: "Mobilim zyre",
        phone: "+383 49 300 103",
        email: "lead3@example.com",
        description: "Tavolina pune, rafte dhe panel akustik.",
        status: LeadStatus.QUALIFIED,
        clientId: clients[2].id,
      },
      {
        name: "Banak lokali",
        phone: "+383 49 300 104",
        email: "lead4@example.com",
        description: "Banak me siperfaqe guri dhe rafte pas banakut.",
        status: LeadStatus.CONVERTED,
        clientId: clients[4].id,
      },
      {
        name: "Tryeze familjare",
        phone: "+383 49 300 105",
        email: "lead5@example.com",
        description: "Tryeze arre per 8 persona me karrige te kombinuara.",
        status: LeadStatus.CLOSED,
      },
    ],
  });

  const materials = await Promise.all(
    [
      {
        name: "MDF i zi mat 18mm",
        sku: "MAT-MDF-BLK-18",
        type: MaterialType.WOOD,
        unit: Unit.SQM,
        stockQuantity: 180,
        lowStockThreshold: 25,
        costPerUnitCents: toCents(18),
        notes: "Panel baze per kuzhina dhe dollape moderne.",
      },
      {
        name: "Panel arre natur 18mm",
        sku: "MAT-WAL-18",
        type: MaterialType.WOOD,
        unit: Unit.SQM,
        stockQuantity: 140,
        lowStockThreshold: 20,
        costPerUnitCents: toCents(22),
        notes: "Dekor arre per fronte dhe rafte.",
      },
      {
        name: "Shina soft-close",
        sku: "HW-SC-RUNNER",
        type: MaterialType.HARDWARE,
        unit: Unit.SET,
        stockQuantity: 75,
        lowStockThreshold: 15,
        costPerUnitCents: toCents(14),
        notes: "Shina me mbyllje te bute per sirtare.",
      },
      {
        name: "Profil LED alumini",
        sku: "LED-ALU-PROFILE",
        type: MaterialType.COMPONENT,
        unit: Unit.METER,
        stockQuantity: 95,
        lowStockThreshold: 20,
        costPerUnitCents: toCents(6),
        notes: "Profil i zi per ndricim linear.",
      },
      {
        name: "Llak mat transparent",
        sku: "FIN-CLEAR-MATTE",
        type: MaterialType.FINISH,
        unit: Unit.KG,
        stockQuantity: 42,
        lowStockThreshold: 8,
        costPerUnitCents: toCents(11),
        notes: "Finalizim mat per dru natyral.",
      },
    ].map((data) => prisma.material.create({ data })),
  );

  await prisma.assetInventory.createMany({
    data: [
      { name: "CNC Router", quantity: 1, valueCents: toCents(28000), purchaseDate: daysFromNow(-420) },
      { name: "Makine prerese panelesh", quantity: 1, valueCents: toCents(18500), purchaseDate: daysFromNow(-360) },
      { name: "Kompresor ajri", quantity: 2, valueCents: toCents(2400), purchaseDate: daysFromNow(-250) },
      { name: "Set veglash montimi", quantity: 5, valueCents: toCents(650), purchaseDate: daysFromNow(-120) },
      { name: "Furgon transporti", quantity: 1, valueCents: toCents(14500), purchaseDate: daysFromNow(-90) },
    ],
  });

  await Promise.all(
    ["Kuzhine start", "Dollap standard", "Banak lokali", "Tryeze arre", "Rafte TV"].map(
      (name, index) =>
        prisma.stok.create({
          data: {
            name,
            priceCents: toCents([2600, 1450, 2200, 980, 1250][index]),
            items: {
              create: [
                { materialId: materials[index % materials.length].id, quantity: [12, 8, 10, 6, 7][index] },
                { materialId: materials[(index + 2) % materials.length].id, quantity: [4, 3, 5, 2, 3][index] },
              ],
            },
          },
        }),
    ),
  );

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const offers = await Promise.all(
    clients.map((client, index) => {
      const unitPriceCents = toCents([3200, 1850, 4100, 2750, 1600][index]);
      const quantity = index === 2 ? 2 : 1;
      const documentTotals = totals(unitPriceCents * quantity);

      return prisma.offer.create({
        data: {
          number: `OF-${year}-${String(index + 1).padStart(3, "0")}`,
          clientId: client.id,
          status: [OfferStatus.PENDING, OfferStatus.ACCEPTED, OfferStatus.PENDING, OfferStatus.ACCEPTED, OfferStatus.REJECTED][index],
          validUntil: daysFromNow(10 + index * 4),
          notes: "Sample offer created by seed data.",
          ...documentTotals,
          items: {
            create: {
              productId: products[index]?.id,
              materialId: materials[index].id,
              productName: products[index]?.nameEn ?? `Custom furniture ${index + 1}`,
              description: "Custom production and installation.",
              quantity,
              unitPriceCents,
              unitCostCents: materials[index].costPerUnitCents * 6,
              lineTotalCents: unitPriceCents * quantity,
            },
          },
        },
      });
    }),
  );

  const invoices = await Promise.all(
    clients.map((client, index) => {
      const unitPriceCents = toCents([2400, 1750, 3600, 1280, 2140][index]);
      const quantity = index === 0 ? 2 : 1;
      const documentTotals = totals(unitPriceCents * quantity);
      const status = [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.UNPAID][index];

      return prisma.invoice.create({
        data: {
          number: `INV-${year}-${String(index + 1).padStart(3, "0")}`,
          clientId: client.id,
          offerId: index < 2 ? offers[index].id : null,
          status,
          dueDate: daysFromNow(index === 3 ? -8 : 7 + index * 3),
          notes: "Sample sales invoice created by seed data.",
          amountPaidCents: amountPaidFor(status, documentTotals.totalCents, toCents(600)),
          paidAt: status === InvoiceStatus.PAID ? daysFromNow(-2) : null,
          ...documentTotals,
          items: {
            create: {
              productId: products[index]?.id,
              materialId: materials[index].id,
              productName: products[index]?.nameEn ?? `Custom invoice item ${index + 1}`,
              description: "Production, delivery and installation.",
              quantity,
              unitPriceCents,
              unitCostCents: materials[index].costPerUnitCents * 5,
              lineTotalCents: unitPriceCents * quantity,
            },
          },
        },
        include: { items: true },
      });
    }),
  );

  await Promise.all(
    suppliers.map((supplier, index) => {
      const unitPriceCents = toCents([720, 460, 980, 380, 520][index]);
      const quantity = [8, 12, 5, 15, 10][index];
      const documentTotals = totals(unitPriceCents * quantity);
      const status = [InvoiceStatus.UNPAID, InvoiceStatus.PAID, InvoiceStatus.PARTIAL, InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE][index];

      return prisma.purchaseInvoice.create({
        data: {
          number: `PINV-${year}-${String(index + 1).padStart(3, "0")}`,
          supplierId: supplier.id,
          status,
          dueDate: daysFromNow(index === 4 ? -5 : 12 + index * 4),
          notes: "Sample purchase invoice created by seed data.",
          amountPaidCents: amountPaidFor(status, documentTotals.totalCents, toCents(900)),
          paidAt: status === InvoiceStatus.PAID ? daysFromNow(-3) : null,
          ...documentTotals,
          items: {
            create: {
              materialId: materials[index].id,
              productName: materials[index].name,
              description: "Material purchase for production stock.",
              quantity,
              unitPriceCents,
              lineTotalCents: unitPriceCents * quantity,
            },
          },
        },
      });
    }),
  );

  await Promise.all(
    Array.from({ length: 5 }, (_, index) => {
      const isSale = index % 2 === 0;

      return prisma.deliveryNote.create({
        data: {
          number: `${isSale ? "SDN" : "PDN"}-${year}-${String(index + 1).padStart(3, "0")}`,
          type: isSale ? DeliveryNoteType.SALES : DeliveryNoteType.PURCHASE,
          status: [DeliveryNoteStatus.DRAFT, DeliveryNoteStatus.DELIVERED, DeliveryNoteStatus.DELIVERED, DeliveryNoteStatus.CANCELLED, DeliveryNoteStatus.DRAFT][index],
          issuedAt: daysFromNow(-index * 2),
          notes: "Sample delivery note created by seed data.",
          clientId: isSale ? clients[index].id : null,
          supplierId: isSale ? null : suppliers[index].id,
          items: {
            create: {
              materialId: materials[index].id,
              productName: isSale ? products[index]?.nameEn ?? "Custom furniture" : materials[index].name,
              description: isSale ? "Finished item delivered to client." : "Incoming supplier material.",
              quantity: [1, 6, 2, 8, 3][index],
            },
          },
        },
      });
    }),
  );

  await prisma.expense.createMany({
    data: [
      {
        name: "Karburant per montime",
        category: ExpenseCategory.FUEL,
        amountCents: toCents(180),
        vatEnabled: true,
        vatRate: 18,
        vatAmountCents: totals(toCents(180)).vatAmountCents,
        totalCents: totals(toCents(180)).totalCents,
        date: daysFromNow(-3),
        supplierName: "Petrol Company",
        description: "Udhetime per montime te klienteve.",
      },
      {
        name: "Dreka e ekipit te montimit",
        category: ExpenseCategory.FOOD,
        amountCents: toCents(95),
        vatEnabled: false,
        vatRate: 18,
        vatAmountCents: totals(toCents(95), false).vatAmountCents,
        totalCents: totals(toCents(95), false).totalCents,
        date: daysFromNow(-5),
        supplierName: "Restaurant Qendra",
        description: "Shpenzim per ekipin ne terren.",
      },
      {
        name: "Transport materialesh",
        category: ExpenseCategory.TRANSPORT,
        amountCents: toCents(260),
        vatEnabled: true,
        vatRate: 18,
        vatAmountCents: totals(toCents(260)).vatAmountCents,
        totalCents: totals(toCents(260)).totalCents,
        date: daysFromNow(-8),
        supplierName: "Transport Express",
        description: "Transport nga furnitori ne punishte.",
      },
      {
        name: "Servisim makinerie",
        category: ExpenseCategory.MAINTENANCE,
        amountCents: toCents(420),
        vatEnabled: true,
        vatRate: 18,
        vatAmountCents: totals(toCents(420)).vatAmountCents,
        totalCents: totals(toCents(420)).totalCents,
        date: daysFromNow(-12),
        supplierName: "Service CNC",
        description: "Kontroll teknik dhe nderrim pjese.",
      },
      {
        name: "Material zyre",
        category: ExpenseCategory.OFFICE,
        amountCents: toCents(75),
        vatEnabled: true,
        vatRate: 18,
        vatAmountCents: totals(toCents(75)).vatAmountCents,
        totalCents: totals(toCents(75)).totalCents,
        date: daysFromNow(-15),
        supplierName: "Office Market",
        description: "Leter, toner dhe furnizime administrative.",
      },
    ],
  });

  await Promise.all(
    invoices.map((invoice, index) => {
      const invoiceItem = invoice.items[0];
      const unitPriceCents = Math.round(invoiceItem.unitPriceCents * 0.1);
      const noteTotals = totals(unitPriceCents);

      return prisma.debitNote.create({
        data: {
          number: `DN-${year}-${String(index + 1).padStart(3, "0")}`,
          clientId: invoice.clientId,
          invoiceId: invoice.id,
          reason: [
            DebitNoteReason.PRICE_CORRECTION,
            DebitNoteReason.ITEM_RETURNED,
            DebitNoteReason.DAMAGED_ITEM,
            DebitNoteReason.ORDER_ADJUSTMENT,
            DebitNoteReason.OTHER,
          ][index],
          notes: "Sample debit note created by seed data.",
          issuedAt: daysFromNow(-index),
          ...noteTotals,
          items: {
            create: {
              invoiceItemId: invoiceItem.id,
              productName: invoiceItem.productName,
              description: "Adjustment against seeded sales invoice.",
              quantity: 1,
              unitPriceCents,
              lineTotalCents: unitPriceCents,
            },
          },
        },
      });
    }),
  );

  const workers = await Promise.all(
    [
      { name: "Besnik Kelmendi", role: "Mjeshter montimi" },
      { name: "Flamur Gashi", role: "Operator CNC" },
      { name: "Ilir Morina", role: "Zdrukthtar" },
      { name: "Valon Berisha", role: "Finisher" },
      { name: "Dion Krasniqi", role: "Asistent montimi" },
    ].map((data) => prisma.worker.create({ data })),
  );

  await Promise.all(
    workers.flatMap((worker, index) => [
      prisma.workerTimeEntry.create({
        data: {
          workerId: worker.id,
          startedAt: new Date(daysFromNow(-index - 1).setHours(8, 0, 0, 0)),
          finishedAt: new Date(daysFromNow(-index - 1).setHours(16, 30, 0, 0)),
        },
      }),
      prisma.workerAdvance.create({
        data: {
          workerId: worker.id,
          date: daysFromNow(-index * 3),
          amountCents: toCents([50, 40, 60, 35, 45][index]),
        },
      }),
    ]),
  );

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
