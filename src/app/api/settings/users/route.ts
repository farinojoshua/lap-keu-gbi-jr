import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { userCreateSchema, userUpdateSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    logError("GET /api/settings/users", err);
    return NextResponse.json({ error: "Gagal mengambil data user" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { username, password, name, role } = userCreateSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword, name, role },
      select: { id: true, username: true, name: true, role: true },
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: `Created user: ${username} (${role})`,
    });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("POST /api/settings/users", err);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...fields } = userUpdateSchema.parse(body);

    const data: Record<string, string> = {};
    if (fields.username) data.username = fields.username;
    if (fields.name) data.name = fields.name;
    if (fields.role) data.role = fields.role;
    if (fields.password) data.password = await bcrypt.hash(fields.password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, role: true },
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      details: `Updated user: ${user.username}`,
    });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("PUT /api/settings/users", err);
    return NextResponse.json({ error: "Gagal mengubah user" }, { status: 500 });
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

    // Prevent deleting last admin
    const admins = await prisma.user.findMany({ where: { role: "admin" } });
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (userToDelete?.role === "admin" && admins.length <= 1) {
      return NextResponse.json({ error: "Tidak bisa menghapus admin terakhir" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "DELETE",
      entity: "User",
      entityId: id,
      details: `Deleted user: ${userToDelete?.username}`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE /api/settings/users", err);
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 });
  }
}
