import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { periodUpdateSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (month && year) {
      let period = await prisma.period.findUnique({
        where: { month_year: { month: parseInt(month), year: parseInt(year) } },
        include: { fundBalances: true },
      });

      if (!period) {
        // Auto-create period
        period = await prisma.period.create({
          data: { month: parseInt(month), year: parseInt(year) },
          include: { fundBalances: true },
        });
      }

      return NextResponse.json(period);
    }

    const periods = await prisma.period.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(periods);
  } catch (err) {
    logError("GET /api/periods", err);
    return NextResponse.json({ error: "Gagal mengambil data periode" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = periodUpdateSchema.parse(body);

    const period = await prisma.period.update({
      where: { id },
      data,
      include: { fundBalances: true },
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "Period",
      entityId: id,
      details: `Updated period`,
    });

    return NextResponse.json(period);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("PUT /api/periods", err);
    return NextResponse.json({ error: "Gagal mengubah periode" }, { status: 500 });
  }
}
