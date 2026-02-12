import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { expenseEntrySchema, expenseUpdateSchema } from "@/lib/validations";

const LOCKED_MSG = "Periode sudah ditutup, data tidak bisa diubah";

async function checkPeriodLocked(periodId: string): Promise<boolean> {
  const period = await prisma.period.findUnique({
    where: { id: periodId },
    select: { isLocked: true },
  });
  return period?.isLocked ?? false;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }

    const entries = await prisma.expenseEntry.findMany({
      where: { periodId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data pengeluaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const validated = body.map((entry) => expenseEntrySchema.parse(entry));
      if (validated.length > 0 && await checkPeriodLocked(validated[0].periodId)) {
        return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
      }
      const entries = await prisma.$transaction(
        validated.map((entry) => prisma.expenseEntry.create({ data: entry }))
      );
      return NextResponse.json(entries);
    }

    const validated = expenseEntrySchema.parse(body);
    if (await checkPeriodLocked(validated.periodId)) {
      return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
    }
    const entry = await prisma.expenseEntry.create({ data: validated });
    return NextResponse.json(entry);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal menyimpan pengeluaran" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = expenseUpdateSchema.parse(body);

    const existing = await prisma.expenseEntry.findUnique({
      where: { id },
      select: { periodId: true },
    });
    if (existing && await checkPeriodLocked(existing.periodId)) {
      return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
    }

    const entry = await prisma.expenseEntry.update({
      where: { id },
      data,
    });

    return NextResponse.json(entry);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal mengubah pengeluaran" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await prisma.expenseEntry.findUnique({
      where: { id },
      select: { periodId: true },
    });
    if (existing && await checkPeriodLocked(existing.periodId)) {
      return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
    }

    await prisma.expenseEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pengeluaran" }, { status: 500 });
  }
}
