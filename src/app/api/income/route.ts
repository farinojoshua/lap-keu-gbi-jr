import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { incomeEntrySchema, incomeUpdateSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

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

    const entries = await prisma.incomeEntry.findMany({
      where: { periodId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(entries);
  } catch (err) {
    logError("GET /api/income", err);
    return NextResponse.json({ error: "Gagal mengambil data pemasukan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    // Support batch creation
    if (Array.isArray(body)) {
      const validated = body.map((entry) => incomeEntrySchema.parse(entry));
      if (validated.length > 0 && await checkPeriodLocked(validated[0].periodId)) {
        return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
      }
      const entries = await prisma.$transaction(
        validated.map((entry) => prisma.incomeEntry.create({ data: entry }))
      );
      for (const entry of entries) {
        await auditLog({
          userId: auth.user.id,
          userName: auth.user.name,
          action: "CREATE",
          entity: "IncomeEntry",
          entityId: entry.id,
          details: `${entry.category} - Rp ${entry.amount}`,
        });
      }
      return NextResponse.json(entries);
    }

    const validated = incomeEntrySchema.parse(body);
    if (await checkPeriodLocked(validated.periodId)) {
      return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
    }
    const entry = await prisma.incomeEntry.create({ data: validated });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "CREATE",
      entity: "IncomeEntry",
      entityId: entry.id,
      details: `${validated.category} - Rp ${validated.amount}`,
    });
    return NextResponse.json(entry);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("POST /api/income", err);
    return NextResponse.json({ error: "Gagal menyimpan pemasukan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = incomeUpdateSchema.parse(body);

    // Check locked via the entry's period
    const existing = await prisma.incomeEntry.findUnique({
      where: { id },
      select: { periodId: true },
    });
    if (existing && await checkPeriodLocked(existing.periodId)) {
      return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
    }

    const entry = await prisma.incomeEntry.update({
      where: { id },
      data,
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "IncomeEntry",
      entityId: id,
      details: `Updated income entry`,
    });

    return NextResponse.json(entry);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("PUT /api/income", err);
    return NextResponse.json({ error: "Gagal mengubah pemasukan" }, { status: 500 });
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

    // Check locked via the entry's period
    const existing = await prisma.incomeEntry.findUnique({
      where: { id },
      select: { periodId: true },
    });
    if (existing && await checkPeriodLocked(existing.periodId)) {
      return NextResponse.json({ error: LOCKED_MSG }, { status: 403 });
    }

    await prisma.incomeEntry.delete({ where: { id } });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "DELETE",
      entity: "IncomeEntry",
      entityId: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE /api/income", err);
    return NextResponse.json({ error: "Gagal menghapus pemasukan" }, { status: 500 });
  }
}
