import { prisma } from "@/lib/prisma";

/**
 * Menghitung saldo pindahan secara dinamis untuk bulan/tahun tertentu.
 * Saldo = saldoPindahan period pertama + akumulasi (income - expense) semua period sebelumnya.
 */
export async function calculateSaldoPindahan(month: number, year: number): Promise<number> {
  // Ambil semua period sebelum bulan/tahun target, urut kronologis
  const previousPeriods = await prisma.period.findMany({
    where: {
      OR: [
        { year: { lt: year } },
        { year: year, month: { lt: month } },
      ],
    },
    include: {
      incomeEntries: true,
      expenseEntries: true,
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  if (previousPeriods.length === 0) {
    return 0;
  }

  // Mulai dari saldoPindahan period pertama (dari "Saldo Awal" di pengaturan)
  let saldo = previousPeriods[0].saldoPindahan;

  // Akumulasi income - expense tiap period
  for (const period of previousPeriods) {
    const totalIncome = period.incomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalExpense = period.expenseEntries.reduce((s, e) => s + e.amount, 0);
    saldo += totalIncome - totalExpense;
  }

  return saldo;
}
