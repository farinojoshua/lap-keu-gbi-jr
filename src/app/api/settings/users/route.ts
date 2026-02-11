import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { username, password, name, role } = await req.json();

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username sudah digunakan" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashedPassword, name, role: role || "bendahara" },
    select: { id: true, username: true, name: true, role: true },
  });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const { id, username, password, name, role } = await req.json();

  const data: Record<string, string> = {};
  if (username) data.username = username;
  if (name) data.name = name;
  if (role) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
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
  return NextResponse.json({ success: true });
}
