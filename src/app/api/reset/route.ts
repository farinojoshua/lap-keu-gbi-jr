import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    // Delete all transactional data in correct order (respecting FK constraints)
    await prisma.$transaction([
      prisma.fundBalance.deleteMany(),
      prisma.incomeEntry.deleteMany(),
      prisma.expenseEntry.deleteMany(),
      prisma.period.deleteMany(),
      prisma.fixedExpenseTemplate.deleteMany(),
      prisma.komselGroup.deleteMany(),
      prisma.user.deleteMany(),
      prisma.churchInfo.deleteMany(),
    ]);

    // Re-seed default data
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        username: "admin",
        password: hashedPassword,
        name: "Administrator",
        role: "admin",
      },
    });

    // Church info
    const churchInfos = [
      { key: "church_name", value: "GBI JONGGOL RAYA" },
      { key: "pastor_name", value: "Frederik Urias Letlora" },
      { key: "treasurer_name", value: "Milka Ariningsih" },
    ];
    for (const info of churchInfos) {
      await prisma.churchInfo.create({ data: info });
    }

    // Expense templates
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
    for (const t of templates) {
      await prisma.fixedExpenseTemplate.create({ data: t });
    }

    // Komsel groups
    const groups = ["Youth", "Karmel", "Wanita", "Sinai", "Sion", "Umas", "Anak", "Moria", "Pria"];
    for (const name of groups) {
      await prisma.komselGroup.create({ data: { name } });
    }

    return NextResponse.json({
      success: true,
      message: "Database berhasil di-reset ke data awal",
    });
  } catch {
    return NextResponse.json({ error: "Gagal mereset database" }, { status: 500 });
  }
}
