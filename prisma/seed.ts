import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      name: "Administrator",
      role: "admin",
    },
  });

  // Create church info
  const churchInfo = [
    { key: "church_name", value: "GBI JONGGOL RAYA" },
    { key: "pastor_name", value: "Frederik Urias Letlora" },
    { key: "treasurer_name", value: "Milka Ariningsih" },
  ];
  for (const info of churchInfo) {
    await prisma.churchInfo.upsert({
      where: { key: info.key },
      update: { value: info.value },
      create: info,
    });
  }

  // Create fixed expense templates
  const templates = [
    { category: "pk_tim", description: "PK Tim Musik", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK WL", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK Singer", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK Tamborin", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK Op. Slide", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK Tim Media", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK GSM", defaultAmount: 55000 },
    { category: "pk_kebersihan", description: "PK Kebersihan", defaultAmount: 150000 },
    { category: "pk_penjemputan", description: "PK Penjemputan", defaultAmount: 100000 },
    { category: "konsumsi", description: "Pembelian Beras", defaultAmount: 100000 },
  ];
  for (const template of templates) {
    const existing = await prisma.fixedExpenseTemplate.findFirst({
      where: { category: template.category, description: template.description },
    });
    if (!existing) {
      await prisma.fixedExpenseTemplate.create({ data: template });
    }
  }

  // Create komsel groups
  const komselGroups = [
    "Youth", "Karmel", "Wanita", "Sinai", "Sion", "Umas", "Anak", "Moria", "Pria",
  ];
  for (const name of komselGroups) {
    await prisma.komselGroup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
