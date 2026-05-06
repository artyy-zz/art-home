import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { publicProductSeeds } from "../src/data/product-catalog";

process.env.DATABASE_URL ??= "file:./prisma/dev.db";

const prisma = new PrismaClient();

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
