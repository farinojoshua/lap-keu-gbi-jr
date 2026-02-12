import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logError } from "@/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get current period
    let currentPeriod = await prisma.period.findUnique({
      where: { month_year: { month: currentMonth, year: currentYear } },
      include: {
        incomeEntries: true,
        expenseEntries: { orderBy: { amount: "desc" } },
      },
    });

    if (!currentPeriod) {
      currentPeriod = await prisma.period.create({
        data: { month: currentMonth, year: currentYear },
        include: {
          incomeEntries: true,
          expenseEntries: { orderBy: { amount: "desc" } },
        },
      });
    }

    const totalIncome = currentPeriod.incomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalExpense = currentPeriod.expenseEntries.reduce((s, e) => s + e.amount, 0);

    // Previous month params
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Run independent queries in parallel
    const [prevPeriod, allPreviousPeriods] = await Promise.all([
      // Previous month for delta comparison
      prisma.period.findUnique({
        where: { month_year: { month: prevMonth, year: prevYear } },
        include: { incomeEntries: true, expenseEntries: true },
      }),
      // All previous periods — used for BOTH saldoPindahan AND trend chart
      prisma.period.findMany({
        where: {
          OR: [
            { year: { lt: currentYear } },
            { year: currentYear, month: { lt: currentMonth } },
          ],
        },
        include: { incomeEntries: true, expenseEntries: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      }),
    ]);

    const prevIncome = prevPeriod?.incomeEntries.reduce((s, e) => s + e.amount, 0) || 0;
    const prevExpense = prevPeriod?.expenseEntries.reduce((s, e) => s + e.amount, 0) || 0;

    // Calculate saldoPindahan from fetched data (no extra query)
    let saldoPindahan = 0;
    if (allPreviousPeriods.length > 0) {
      saldoPindahan = allPreviousPeriods[0].saldoPindahan;
      for (const period of allPreviousPeriods) {
        const inc = period.incomeEntries.reduce((s, e) => s + e.amount, 0);
        const exp = period.expenseEntries.reduce((s, e) => s + e.amount, 0);
        saldoPindahan += inc - exp;
      }
    }

    // Build trend from last 6 periods that have data (reuse fetched data)
    const periodsWithEntries = allPreviousPeriods.filter(
      (p) => p.incomeEntries.length > 0 || p.expenseEntries.length > 0
    );
    // Include current period in trend if it has data
    const currentHasData = currentPeriod.incomeEntries.length > 0 || currentPeriod.expenseEntries.length > 0;
    const trendPeriods = currentHasData
      ? [...periodsWithEntries, currentPeriod]
      : periodsWithEntries;

    const trend = trendPeriods.slice(-6).map((p) => ({
      month: p.month,
      year: p.year,
      income: p.incomeEntries.reduce((s, e) => s + e.amount, 0),
      expense: p.expenseEntries.reduce((s, e) => s + e.amount, 0),
    }));

    // Weekly attendance & persembahan (from current period entries)
    const attendanceEntries = currentPeriod.incomeEntries
      .filter((e) => e.category === "persembahan" && e.subcategory === "kantong_ungu" && e.attendance)
      .sort((a, b) => a.date.localeCompare(b.date));

    const avgAttendance =
      attendanceEntries.length > 0
        ? Math.round(attendanceEntries.reduce((s, e) => s + (e.attendance || 0), 0) / attendanceEntries.length)
        : 0;

    // Build weekly data grouped by date
    const persembahanEntries = currentPeriod.incomeEntries
      .filter((e) => e.category === "persembahan")
      .sort((a, b) => a.date.localeCompare(b.date));

    const weeklyMap = new Map<string, { date: string; attendance: number; persembahan: number }>();
    for (const e of persembahanEntries) {
      const existing = weeklyMap.get(e.date) || { date: e.date, attendance: 0, persembahan: 0 };
      existing.persembahan += e.amount;
      if (e.subcategory === "kantong_ungu" && e.attendance) {
        existing.attendance = e.attendance;
      }
      weeklyMap.set(e.date, existing);
    }
    const weeklyData = Array.from(weeklyMap.values());

    const totalPersembahan = persembahanEntries.reduce((s, e) => s + e.amount, 0);

    // Category breakdowns (single pass each)
    const incomeByCategory: Record<string, number> = {};
    for (const e of currentPeriod.incomeEntries) {
      incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.amount;
    }
    const expenseByCategory: Record<string, number> = {};
    for (const e of currentPeriod.expenseEntries) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }

    // Top 5 expenses (already sorted desc from query)
    const topExpenses = currentPeriod.expenseEntries.slice(0, 5).map((e) => ({
      description: e.description,
      category: e.category,
      amount: e.amount,
      date: e.date,
    }));

    return NextResponse.json({
      currentMonth,
      currentYear,
      isLocked: currentPeriod.isLocked,
      saldoPindahan,
      totalIncome,
      totalExpense,
      saldo: saldoPindahan + totalIncome - totalExpense,
      avgAttendance,
      totalPersembahan,
      weeklyData,
      trend,
      prevMonth: { month: prevMonth, year: prevYear, income: prevIncome, expense: prevExpense },
      incomeByCategory,
      expenseByCategory,
      topExpenses,
    });
  } catch (err) {
    logError("GET /api/dashboard", err);
    return NextResponse.json({ error: "Gagal memuat dashboard" }, { status: 500 });
  }
}
