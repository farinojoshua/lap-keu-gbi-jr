import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { expenseTemplateCreateSchema, expenseTemplateUpdateSchema } from "@/lib/validations";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const templates = await prisma.fixedExpenseTemplate.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil template" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validated = expenseTemplateCreateSchema.parse(body);
    const template = await prisma.fixedExpenseTemplate.create({ data: validated });
    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal membuat template" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = expenseTemplateUpdateSchema.parse(body);

    const template = await prisma.fixedExpenseTemplate.update({
      where: { id },
      data,
    });
    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal mengubah template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await prisma.fixedExpenseTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus template" }, { status: 500 });
  }
}
