import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get current period
  let currentPeriod = await prisma.period.findUnique({
    where: { month_year: { month: currentMonth, year: currentYear } },
    include: {
      incomeEntries: true,
      expenseEntries: true,
    },
  });

  if (!currentPeriod) {
    currentPeriod = await prisma.period.create({
      data: { month: currentMonth, year: currentYear },
      include: { incomeEntries: true, expenseEntries: true },
    });
  }

  const totalIncome = currentPeriod.incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpense = currentPeriod.expenseEntries.reduce((s, e) => s + e.amount, 0);

  // Average attendance (from persembahan entries with attendance)
  const attendanceEntries = currentPeriod.incomeEntries.filter(
    (e) => e.category === "persembahan" && e.subcategory === "kantong_ungu" && e.attendance
  );
  const avgAttendance =
    attendanceEntries.length > 0
      ? Math.round(attendanceEntries.reduce((s, e) => s + (e.attendance || 0), 0) / attendanceEntries.length)
      : 0;

  // Total persembahan (kantong) this month
  const totalPersembahan = currentPeriod.incomeEntries
    .filter((e) => e.category === "persembahan")
    .reduce((s, e) => s + e.amount, 0);

  // Get last 6 months trend
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m <= 0) {
      m += 12;
      y--;
    }
    const period = await prisma.period.findUnique({
      where: { month_year: { month: m, year: y } },
      include: { incomeEntries: true, expenseEntries: true },
    });
    trend.push({
      month: m,
      year: y,
      income: period?.incomeEntries.reduce((s, e) => s + e.amount, 0) || 0,
      expense: period?.expenseEntries.reduce((s, e) => s + e.amount, 0) || 0,
    });
  }

  return NextResponse.json({
    currentMonth,
    currentYear,
    saldoPindahan: currentPeriod.saldoPindahan,
    totalIncome,
    totalExpense,
    saldo: currentPeriod.saldoPindahan + totalIncome - totalExpense,
    avgAttendance,
    totalPersembahan,
    trend,
  });
}
