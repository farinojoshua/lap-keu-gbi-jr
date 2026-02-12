import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSaldoPindahan } from "@/lib/saldo";
import { requireAuth } from "@/lib/auth";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "0");
    const year = parseInt(searchParams.get("year") || "0");

    if (!month || !year) {
      return NextResponse.json({ error: "month and year required" }, { status: 400 });
    }

    let period = await prisma.period.findUnique({
      where: { month_year: { month, year } },
      include: {
        incomeEntries: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
        expenseEntries: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
        fundBalances: true,
      },
    });

    if (!period) {
      period = await prisma.period.create({
        data: { month, year },
        include: {
          incomeEntries: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
          expenseEntries: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] },
          fundBalances: true,
        },
      });
    }

    // Run independent queries in parallel
    const [churchInfoRows, saldoPindahan] = await Promise.all([
      prisma.churchInfo.findMany(),
      calculateSaldoPindahan(month, year),
    ]);

    // Group income by category
    const incomeByCategory: Record<string, { entries: typeof period.incomeEntries; subtotal: number }> = {};
    for (const entry of period.incomeEntries) {
      if (!incomeByCategory[entry.category]) {
        incomeByCategory[entry.category] = { entries: [], subtotal: 0 };
      }
      incomeByCategory[entry.category].entries.push(entry);
      incomeByCategory[entry.category].subtotal += entry.amount;
    }

    // Group expense by category
    const expenseByCategory: Record<string, { entries: typeof period.expenseEntries; subtotal: number }> = {};
    for (const entry of period.expenseEntries) {
      if (!expenseByCategory[entry.category]) {
        expenseByCategory[entry.category] = { entries: [], subtotal: 0 };
      }
      expenseByCategory[entry.category].entries.push(entry);
      expenseByCategory[entry.category].subtotal += entry.amount;
    }

    const totalIncome = period.incomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalExpense = period.expenseEntries.reduce((s, e) => s + e.amount, 0);

    const churchInfo: Record<string, string> = {};
    churchInfoRows.forEach((r) => { churchInfo[r.key] = r.value; });

    // Fund balances
    const fundBalances: Record<string, number> = {};
    period.fundBalances.forEach((f) => { fundBalances[f.fundType] = f.balance; });

    return NextResponse.json({
      period: {
        id: period.id,
        month: period.month,
        year: period.year,
        saldoPindahan,
        saldoRekening: period.saldoRekening,
        saldoCash: period.saldoCash,
        isLocked: period.isLocked,
      },
      incomeByCategory,
      expenseByCategory,
      totalIncome,
      totalExpense,
      saldo: saldoPindahan + totalIncome - totalExpense,
      churchInfo,
      fundBalances,
    });
  } catch (err) {
    logError("GET /api/report", err);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
