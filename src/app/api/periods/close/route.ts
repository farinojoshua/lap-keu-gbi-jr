import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { periodId } = await req.json();

    if (!periodId || typeof periodId !== "string") {
      return NextResponse.json({ error: "periodId wajib diisi" }, { status: 400 });
    }

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

    // Lock current period + create next period + carry over fund balances
    // All in a single transaction for atomicity
    let nextMonth = period.month + 1;
    let nextYear = period.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }

    await prisma.$transaction(async (tx) => {
      // Lock current period
      await tx.period.update({
        where: { id: periodId },
        data: { isLocked: true },
      });

      // Create or update next period (carry over saldoRekening & saldoCash)
      const nextPeriod = await tx.period.upsert({
        where: { month_year: { month: nextMonth, year: nextYear } },
        update: {
          saldoRekening: period.saldoRekening,
          saldoCash: period.saldoCash,
        },
        create: {
          month: nextMonth,
          year: nextYear,
          saldoRekening: period.saldoRekening,
          saldoCash: period.saldoCash,
        },
      });

      // Carry over fund balances
      for (const fund of period.fundBalances) {
        await tx.fundBalance.upsert({
          where: {
            periodId_fundType: {
              periodId: nextPeriod.id,
              fundType: fund.fundType,
            },
          },
          update: { balance: fund.balance },
          create: {
            periodId: nextPeriod.id,
            fundType: fund.fundType,
            balance: fund.balance,
          },
        });
      }
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "Period",
      entityId: periodId,
      details: `Closed period ${period.month}/${period.year}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("POST /api/periods/close", err);
    return NextResponse.json({ error: "Gagal menutup periode" }, { status: 500 });
  }
}
