import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const groups = await prisma.komselGroup.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const group = await prisma.komselGroup.create({ data: { name } });
  return NextResponse.json(group);
}

export async function PUT(req: NextRequest) {
  const { id, name, isActive } = await req.json();
  const group = await prisma.komselGroup.update({
    where: { id },
    data: { name, isActive },
  });
  return NextResponse.json(group);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await prisma.komselGroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
