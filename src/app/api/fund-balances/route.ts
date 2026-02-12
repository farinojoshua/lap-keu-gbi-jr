import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fundBalanceSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }

    const balances = await prisma.fundBalance.findMany({
      where: { periodId },
    });

    return NextResponse.json(balances);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data saldo dana" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { periodId, fundType, balance, note } = fundBalanceSchema.parse(body);

    const result = await prisma.fundBalance.upsert({
      where: { periodId_fundType: { periodId, fundType } },
      update: { balance, note },
      create: { periodId, fundType, balance, note },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal menyimpan saldo dana" }, { status: 500 });
  }
}
