const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seed() {
  // Create default admin user
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        username: "admin",
        password: hash,
        name: "Administrator",
        role: "admin",
      },
    });
    console.log("Default admin user created");
  } else {
    console.log("Users already exist, skipping admin creation");
  }

  // Create church info
  const churchInfos = [
    { key: "church_name", value: "GBI JONGGOL RAYA" },
    { key: "pastor_name", value: "Frederik Urias Letlora" },
    { key: "treasurer_name", value: "Milka Ariningsih" },
  ];
  for (const info of churchInfos) {
    const existing = await prisma.churchInfo.findUnique({
      where: { key: info.key },
    });
    if (!existing) {
      await prisma.churchInfo.create({ data: info });
      console.log(`Church info created: ${info.key}`);
    }
  }

  // Create fixed expense templates
  const templates = [
    { category: "pk_tim", description: "PK Tim Musik", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK WL", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK Singer", defaultAmount: 55000 },
    { category: "pk_tim", description: "PK Tamborin", defaultAmount: 55000 },
    {
      category: "pk_tim",
      description: "PK Op. Slide",
      defaultAmount: 55000,
    },
    {
      category: "pk_tim",
      description: "PK Tim Media",
      defaultAmount: 55000,
    },
    { category: "pk_tim", description: "PK GSM", defaultAmount: 55000 },
    {
      category: "pk_kebersihan",
      description: "PK Kebersihan",
      defaultAmount: 150000,
    },
    {
      category: "pk_penjemputan",
      description: "PK Penjemputan",
      defaultAmount: 100000,
    },
    {
      category: "konsumsi",
      description: "Pembelian Beras",
      defaultAmount: 100000,
    },
  ];
  for (const t of templates) {
    const existing = await prisma.fixedExpenseTemplate.findFirst({
      where: { category: t.category, description: t.description },
    });
    if (!existing) {
      await prisma.fixedExpenseTemplate.create({ data: t });
      console.log(`Template created: ${t.description}`);
    }
  }

  // Create komsel groups
  const groups = [
    "Youth",
    "Karmel",
    "Wanita",
    "Sinai",
    "Sion",
    "Umas",
    "Anak",
    "Moria",
    "Pria",
  ];
  for (const name of groups) {
    const existing = await prisma.komselGroup.findUnique({ where: { name } });
    if (!existing) {
      await prisma.komselGroup.create({ data: { name } });
      console.log(`Komsel group created: ${name}`);
    }
  }

  console.log("Seed completed successfully!");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
