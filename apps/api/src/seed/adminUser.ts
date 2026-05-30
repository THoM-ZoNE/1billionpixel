import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "thomzone@thomzone.net";
  const password = "enter_password_here"; // run only once with npx tsx adminUser.ts, then delete or change this password
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Admin created: ${email}`);
  await prisma.$disconnect();
}

main();