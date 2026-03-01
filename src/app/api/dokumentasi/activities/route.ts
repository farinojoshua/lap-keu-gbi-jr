import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireDocOrAdmin } from "@/lib/auth";
import { activityCreateSchema, activityUpdateSchema } from "@/lib/validations";
import { deleteFromR2 } from "@/lib/r2";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const activities = await prisma.activity.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(activities);
  } catch (err) {
    logError("GET /api/dokumentasi/activities", err);
    return NextResponse.json({ error: "Gagal mengambil data kegiatan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { name } = activityCreateSchema.parse(body);
    const activity = await prisma.activity.create({ data: { name } });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "CREATE",
      entity: "Activity",
      entityId: activity.id,
      details: `Created activity: ${name}`,
    });
    return NextResponse.json(activity);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("POST /api/dokumentasi/activities", err);
    return NextResponse.json({ error: "Gagal membuat kegiatan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...data } = activityUpdateSchema.parse(body);
    const activity = await prisma.activity.update({ where: { id }, data });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "Activity",
      entityId: id,
      details: `Updated activity: ${activity.name}`,
    });
    return NextResponse.json(activity);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("PUT /api/dokumentasi/activities", err);
    return NextResponse.json({ error: "Gagal mengubah kegiatan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Delete all R2 files for this activity first
    const mediaList = await prisma.media.findMany({ where: { activityId: id } });
    await Promise.all(mediaList.map((m) => deleteFromR2(m.r2Key).catch(() => null)));

    await prisma.activity.delete({ where: { id } });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "DELETE",
      entity: "Activity",
      entityId: id,
      details: `Deleted activity with ${mediaList.length} media files and folders`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE /api/dokumentasi/activities", err);
    return NextResponse.json({ error: "Gagal menghapus kegiatan" }, { status: 500 });
  }
}
