import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { komselCreateSchema, komselUpdateSchema } from "@/lib/validations";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const groups = await prisma.komselGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(groups);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data komsel" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { name } = komselCreateSchema.parse(body);
    const group = await prisma.komselGroup.create({ data: { name } });
    return NextResponse.json(group);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal membuat grup komsel" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = komselUpdateSchema.parse(body);

    const group = await prisma.komselGroup.update({
      where: { id },
      data,
    });
    return NextResponse.json(group);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal mengubah grup komsel" }, { status: 500 });
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
    await prisma.komselGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus grup komsel" }, { status: 500 });
  }
}
