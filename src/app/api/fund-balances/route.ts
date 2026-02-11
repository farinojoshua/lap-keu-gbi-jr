import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodId = searchParams.get("periodId");

  if (!periodId) {
    return NextResponse.json({ error: "periodId required" }, { status: 400 });
  }

  const balances = await prisma.fundBalance.findMany({
    where: { periodId },
  });

  return NextResponse.json(balances);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { periodId, fundType, balance, note } = body;

  const result = await prisma.fundBalance.upsert({
    where: { periodId_fundType: { periodId, fundType } },
    update: { balance, note: note || "" },
    create: { periodId, fundType, balance, note: note || "" },
  });

  return NextResponse.json(result);
}
