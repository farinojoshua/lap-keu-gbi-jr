import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { periodId } = await req.json();

  const period = await prisma.period.findUnique({
    where: { id: periodId },
    include: {
      incomeEntries: true,
      expenseEntries: true,
      fundBalances: true,
    },
  });

  if (!period) {
    return NextResponse.json({ error: "Period not found" }, { status: 404 });
  }

  const totalIncome = period.incomeEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = period.expenseEntries.reduce((sum, e) => sum + e.amount, 0);
  const saldo = period.saldoPindahan + totalIncome - totalExpense;

  // Lock current period
  await prisma.period.update({
    where: { id: periodId },
    data: { isLocked: true },
  });

  // Create or update next period
  let nextMonth = period.month + 1;
  let nextYear = period.year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  await prisma.period.upsert({
    where: { month_year: { month: nextMonth, year: nextYear } },
    update: {
      saldoPindahan: saldo,
      saldoRekening: period.saldoRekening,
      saldoCash: period.saldoCash,
    },
    create: {
      month: nextMonth,
      year: nextYear,
      saldoPindahan: saldo,
      saldoRekening: period.saldoRekening,
      saldoCash: period.saldoCash,
    },
  });

  // Carry over fund balances
  for (const fund of period.fundBalances) {
    await prisma.fundBalance.upsert({
      where: {
        periodId_fundType: {
          periodId: (
            await prisma.period.findUnique({
              where: { month_year: { month: nextMonth, year: nextYear } },
            })
          )!.id,
          fundType: fund.fundType,
        },
      },
      update: { balance: fund.balance },
      create: {
        periodId: (
          await prisma.period.findUnique({
            where: { month_year: { month: nextMonth, year: nextYear } },
          })
        )!.id,
        fundType: fund.fundType,
        balance: fund.balance,
      },
    });
  }

  return NextResponse.json({ success: true });
}
