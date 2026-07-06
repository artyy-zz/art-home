import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const ownerUsername = process.env.OWNER_USERNAME ?? "Art";
const ownerName = process.env.OWNER_NAME ?? ownerUsername;
const ownerPassword = process.env.OWNER_PASSWORD ?? "Admin123!";

async function main() {
  const ownerRole = await prisma.role.upsert({
    where: { key: "OWNER" },
    update: {
      name: "Owner / Super Admin",
      description: "Full system access for the ARTHOME ERP owner.",
      isSystem: true,
      isOwner: true,
    },
    create: {
      key: "OWNER",
      name: "Owner / Super Admin",
      description: "Full system access for the ARTHOME ERP owner.",
      isSystem: true,
      isOwner: true,
    },
  });

  
  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  await prisma.user.upsert({
    where: { usernameNormalized: ownerUsername.toLowerCase() },
    update: {
      name: ownerName,
      username: ownerUsername,
      usernameNormalized: ownerUsername.toLowerCase(),
      password: ownerPassword,
      passwordHash,
      role: UserRole.OWNER,
      roleId: ownerRole.id,
    },
    create: {
      name: ownerName,
      username: ownerUsername,
      usernameNormalized: ownerUsername.toLowerCase(),
      password: ownerPassword,
      passwordHash,
      role: UserRole.OWNER,
      roleId: ownerRole.id,
    },
  });

  console.log(`Owner user ready: ${ownerUsername}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
