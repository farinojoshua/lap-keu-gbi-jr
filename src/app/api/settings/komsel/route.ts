import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { komselCreateSchema, komselUpdateSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const groups = await prisma.komselGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(groups);
  } catch (err) {
    logError("GET /api/settings/komsel", err);
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
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "CREATE",
      entity: "KomselGroup",
      entityId: group.id,
      details: `Created group: ${name}`,
    });
    return NextResponse.json(group);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("POST /api/settings/komsel", err);
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
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "KomselGroup",
      entityId: id,
      details: `Updated group: ${group.name}`,
    });
    return NextResponse.json(group);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("PUT /api/settings/komsel", err);
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
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "DELETE",
      entity: "KomselGroup",
      entityId: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE /api/settings/komsel", err);
    return NextResponse.json({ error: "Gagal menghapus grup komsel" }, { status: 500 });
  }
}
