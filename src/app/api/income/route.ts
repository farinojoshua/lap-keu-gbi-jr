import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Support batch creation
  if (Array.isArray(body)) {
    const entries = await prisma.$transaction(
      body.map((entry: Record<string, unknown>) =>
        prisma.incomeEntry.create({ data: entry as { periodId: string; date: string; category: string; subcategory?: string; description?: string; amount: number; attendance?: number } })
      )
    );
    return NextResponse.json(entries);
  }

  const entry = await prisma.incomeEntry.create({ data: body });
  return NextResponse.json(entry);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;

  const entry = await prisma.incomeEntry.update({
    where: { id },
    data,
  });

  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.incomeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
