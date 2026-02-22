import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (!type || !["expense", "income_other"].includes(type)) {
    return NextResponse.json({ error: "Parameter type tidak valid" }, { status: 400 });
  }

  try {
    const categories = await prisma.category.findMany({
      where: { type },
      select: { id: true, key: true, label: true },
      orderBy: { label: "asc" },
    });
    return NextResponse.json(categories);
  } catch (err) {
    logError("GET /api/settings/categories", err);
    return NextResponse.json({ error: "Gagal mengambil data kategori" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { type, key, label } = body as { type: string; key: string; label: string };

    if (!type || !["expense", "income_other"].includes(type)) {
      return NextResponse.json({ error: "Type tidak valid" }, { status: 400 });
    }
    if (!key || !/^[a-z0-9_]+$/.test(key)) {
      return NextResponse.json({ error: "Key harus huruf kecil, angka, atau underscore" }, { status: 400 });
    }
    if (!label || label.trim().length === 0) {
      return NextResponse.json({ error: "Label wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { type_key: { type, key } } });
    if (existing) {
      return NextResponse.json({ error: "Kategori dengan key tersebut sudah ada" }, { status: 400 });
    }

    const category = await prisma.category.create({ data: { type, key, label: label.trim() } });
    return NextResponse.json(category);
  } catch (err) {
    logError("POST /api/settings/categories", err);
    return NextResponse.json({ error: "Gagal membuat kategori" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, label } = body as { id: string; label: string };

    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }
    if (!label || label.trim().length === 0) {
      return NextResponse.json({ error: "Label wajib diisi" }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { label: label.trim() },
    });
    return NextResponse.json(category);
  } catch (err) {
    logError("PUT /api/settings/categories", err);
    return NextResponse.json({ error: "Gagal memperbarui kategori" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    // Check if category key is used in expense or income entries
    let usageCount = 0;
    if (category.type === "expense") {
      usageCount = await prisma.expenseEntry.count({ where: { category: category.key } });
    } else if (category.type === "income_other") {
      usageCount = await prisma.incomeEntry.count({ where: { category: category.key } });
    }

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Kategori masih digunakan oleh ${usageCount} entri` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE /api/settings/categories", err);
    return NextResponse.json({ error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
