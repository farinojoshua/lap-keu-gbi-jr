import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import Database from "better-sqlite3";

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

interface SqliteUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: string;
  createdAt: string;
}

interface SqlitePeriod {
  id: string;
  month: number;
  year: number;
  saldoPindahan: number;
  saldoRekening: number;
  saldoCash: number;
  isLocked: number;
  createdAt: string;
}

interface SqliteIncomeEntry {
  id: string;
  periodId: string;
  date: string;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  attendance: number | null;
  createdAt: string;
}

interface SqliteExpenseEntry {
  id: string;
  periodId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  isFixed: number;
  createdAt: string;
}

interface SqliteFixedExpenseTemplate {
  id: string;
  category: string;
  description: string;
  defaultAmount: number;
  isActive: number;
}

interface SqliteFundBalance {
  id: string;
  periodId: string;
  fundType: string;
  balance: number;
  note: string;
}

interface SqliteKomselGroup {
  id: string;
  name: string;
  isActive: number;
}

interface SqliteChurchInfo {
  id: string;
  key: string;
  value: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let db: InstanceType<typeof Database> | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (!file.name.endsWith(".db")) {
      return NextResponse.json({ error: "File harus berekstensi .db" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file melebihi batas 100MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    db = new Database(buffer, { readonly: true });

    function hasTable(name: string): boolean {
      const row = db!
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(name);
      return !!row;
    }

    // Read all tables (with guard)
    const users = hasTable("User")
      ? (db.prepare("SELECT * FROM User").all() as SqliteUser[])
      : [];
    const periods = hasTable("Period")
      ? (db.prepare("SELECT * FROM Period").all() as SqlitePeriod[])
      : [];
    const incomeEntries = hasTable("IncomeEntry")
      ? (db.prepare("SELECT * FROM IncomeEntry").all() as SqliteIncomeEntry[])
      : [];
    const expenseEntries = hasTable("ExpenseEntry")
      ? (db.prepare("SELECT * FROM ExpenseEntry").all() as SqliteExpenseEntry[])
      : [];
    const templates = hasTable("FixedExpenseTemplate")
      ? (db.prepare("SELECT * FROM FixedExpenseTemplate").all() as SqliteFixedExpenseTemplate[])
      : [];
    const fundBalances = hasTable("FundBalance")
      ? (db.prepare("SELECT * FROM FundBalance").all() as SqliteFundBalance[])
      : [];
    const komselGroups = hasTable("KomselGroup")
      ? (db.prepare("SELECT * FROM KomselGroup").all() as SqliteKomselGroup[])
      : [];
    const churchInfos = hasTable("ChurchInfo")
      ? (db.prepare("SELECT * FROM ChurchInfo").all() as SqliteChurchInfo[])
      : [];

    db.close();
    db = null;

    // Delete existing data in FK-safe order
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

    // Insert in FK-safe order: ChurchInfo → KomselGroup → FixedExpenseTemplate → User → Period → IncomeEntry → ExpenseEntry → FundBalance
    if (churchInfos.length > 0) {
      await prisma.churchInfo.createMany({
        data: churchInfos.map((r) => ({ id: r.id, key: r.key, value: r.value })),
      });
    }

    if (komselGroups.length > 0) {
      await prisma.komselGroup.createMany({
        data: komselGroups.map((r) => ({
          id: r.id,
          name: r.name,
          isActive: Boolean(r.isActive),
        })),
      });
    }

    if (templates.length > 0) {
      await prisma.fixedExpenseTemplate.createMany({
        data: templates.map((r) => ({
          id: r.id,
          category: r.category,
          description: r.description,
          defaultAmount: r.defaultAmount,
          isActive: Boolean(r.isActive),
        })),
      });
    }

    if (users.length > 0) {
      await prisma.user.createMany({
        data: users.map((r) => ({
          id: r.id,
          username: r.username,
          password: r.password,
          name: r.name,
          role: r.role,
          createdAt: new Date(r.createdAt),
        })),
      });
    }

    if (periods.length > 0) {
      await prisma.period.createMany({
        data: periods.map((r) => ({
          id: r.id,
          month: r.month,
          year: r.year,
          saldoPindahan: r.saldoPindahan,
          saldoRekening: r.saldoRekening,
          saldoCash: r.saldoCash,
          isLocked: Boolean(r.isLocked),
          createdAt: new Date(r.createdAt),
        })),
      });
    }

    if (incomeEntries.length > 0) {
      await prisma.incomeEntry.createMany({
        data: incomeEntries.map((r) => ({
          id: r.id,
          periodId: r.periodId,
          date: r.date,
          category: r.category,
          subcategory: r.subcategory ?? "",
          description: r.description ?? "",
          amount: r.amount,
          attendance: r.attendance ?? null,
          createdAt: new Date(r.createdAt),
        })),
      });
    }

    if (expenseEntries.length > 0) {
      await prisma.expenseEntry.createMany({
        data: expenseEntries.map((r) => ({
          id: r.id,
          periodId: r.periodId,
          date: r.date,
          category: r.category,
          description: r.description ?? "",
          amount: r.amount,
          isFixed: Boolean(r.isFixed),
          createdAt: new Date(r.createdAt),
        })),
      });
    }

    if (fundBalances.length > 0) {
      await prisma.fundBalance.createMany({
        data: fundBalances.map((r) => ({
          id: r.id,
          periodId: r.periodId,
          fundType: r.fundType,
          balance: r.balance,
          note: r.note ?? "",
        })),
      });
    }

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "RESTORE",
      entity: "Database",
      entityId: "sqlite-import",
      details: `Import dari .db: ${file.name}`,
    });

    return NextResponse.json({
      success: true,
      counts: {
        users: users.length,
        periods: periods.length,
        incomeEntries: incomeEntries.length,
        expenseEntries: expenseEntries.length,
      },
    });
  } catch (err) {
    if (db) {
      try { db.close(); } catch { /* ignore */ }
    }
    logError("POST /api/import-sqlite", err);
    return NextResponse.json({ error: "Gagal mengimport database SQLite" }, { status: 500 });
  }
}
