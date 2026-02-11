import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.fixedExpenseTemplate.findMany({
    where: { isActive: true },
    orderBy: { category: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const template = await prisma.fixedExpenseTemplate.create({ data: body });
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const template = await prisma.fixedExpenseTemplate.update({
    where: { id },
    data,
  });
  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await prisma.fixedExpenseTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
