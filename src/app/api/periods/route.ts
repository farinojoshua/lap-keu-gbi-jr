import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;

  const period = await prisma.period.update({
    where: { id },
    data,
    include: { fundBalances: true },
  });

  return NextResponse.json(period);
}
