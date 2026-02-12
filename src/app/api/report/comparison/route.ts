import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = searchParams.get("months"); // e.g. "1,2,3"
    const year = parseInt(searchParams.get("year") || "0");

    if (!monthsParam || !year) {
      return NextResponse.json({ error: "months and year required" }, { status: 400 });
    }

    // Limit input length to prevent DoS, dedup, max 12 months
    if (monthsParam.length > 100) {
      return NextResponse.json({ error: "Parameter terlalu panjang" }, { status: 400 });
    }

    const months = [...new Set(
      monthsParam
        .split(",")
        .slice(0, 12)
        .map((m) => parseInt(m.trim()))
        .filter((m) => m >= 1 && m <= 12)
    )].sort((a, b) => a - b);

    if (months.length === 0) {
      return NextResponse.json({ error: "invalid months" }, { status: 400 });
    }

    // Fetch ALL periods up to the latest requested month in ONE query
    // This covers both: periods we need to display + all prior periods for saldo calculation
    const latestMonth = months[months.length - 1];
    const [allPeriods, churchInfoRows] = await Promise.all([
      prisma.period.findMany({
        where: {
          OR: [
            { year: { lt: year } },
            { year: year, month: { lte: latestMonth } },
          ],
        },
        include: { incomeEntries: true, expenseEntries: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      }),
      prisma.churchInfo.findMany(),
    ]);

    // Pre-compute cumulative saldo for each period
    // saldoMap[periodKey] = saldoPindahan for that month
    const saldoMap = new Map<string, number>();
    let cumulativeSaldo = allPeriods.length > 0 ? allPeriods[0].saldoPindahan : 0;

    for (const p of allPeriods) {
      const key = `${p.year}-${p.month}`;
      saldoMap.set(key, cumulativeSaldo);

      const inc = p.incomeEntries.reduce((s, e) => s + e.amount, 0);
      const exp = p.expenseEntries.reduce((s, e) => s + e.amount, 0);
      cumulativeSaldo += inc - exp;
    }

    // Build results for requested months
    const results = [];
    for (const month of months) {
      const period = allPeriods.find((p) => p.month === month && p.year === year);

      const incomeEntries = period?.incomeEntries || [];
      const expenseEntries = period?.expenseEntries || [];

      const incomeByCategory: Record<string, number> = {};
      for (const entry of incomeEntries) {
        incomeByCategory[entry.category] = (incomeByCategory[entry.category] || 0) + entry.amount;
      }

      const expenseByCategory: Record<string, number> = {};
      for (const entry of expenseEntries) {
        expenseByCategory[entry.category] = (expenseByCategory[entry.category] || 0) + entry.amount;
      }

      const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
      const totalExpense = expenseEntries.reduce((s, e) => s + e.amount, 0);
      const saldoPindahan = saldoMap.get(`${year}-${month}`) || 0;

      results.push({
        month,
        year,
        totalIncome,
        totalExpense,
        saldoPindahan,
        saldo: saldoPindahan + totalIncome - totalExpense,
        incomeByCategory,
        expenseByCategory,
      });
    }

    const allIncomeCategories = [...new Set(results.flatMap((r) => Object.keys(r.incomeByCategory)))];
    const allExpenseCategories = [...new Set(results.flatMap((r) => Object.keys(r.expenseByCategory)))];

    const churchInfo: Record<string, string> = {};
    churchInfoRows.forEach((r) => { churchInfo[r.key] = r.value; });

    return NextResponse.json({
      results,
      allIncomeCategories,
      allExpenseCategories,
      churchInfo,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat perbandingan laporan" }, { status: 500 });
  }
}
