import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "thomzone@thomzone.net";
  const password = "jelszot_beírod_ide"; // csak egyszer futtatod majd npx tsx adminUser.ts-vel, utána törölheted vagy megváltoztathatod ezt a jelszót
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Admin létrehozva: ${email}`);
  await prisma.$disconnect();
}

main();