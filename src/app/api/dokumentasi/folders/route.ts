import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDocOrAdmin } from "@/lib/auth";
import { folderCreateSchema, folderUpdateSchema } from "@/lib/validations";
import { deleteFromR2 } from "@/lib/r2";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

async function collectDescendantIds(folderId: string): Promise<string[]> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });
  const ids = [folderId];
  for (const child of children) {
    ids.push(...(await collectDescendantIds(child.id)));
  }
  return ids;
}

export async function GET(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activityId");
    if (!activityId) {
      return NextResponse.json({ error: "activityId required" }, { status: 400 });
    }
    const parentIdParam = searchParams.get("parentId");
    const parentId = parentIdParam ?? null;

    const folders = await prisma.folder.findMany({
      where: { activityId, parentId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(folders);
  } catch (err) {
    logError("GET /api/dokumentasi/folders", err);
    return NextResponse.json({ error: "Gagal mengambil data folder" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = folderCreateSchema.parse(body);

    // Verify activity exists
    const activity = await prisma.activity.findUnique({ where: { id: data.activityId } });
    if (!activity) {
      return NextResponse.json({ error: "Kegiatan tidak ditemukan" }, { status: 404 });
    }

    // Verify parentId belongs to same activity
    if (data.parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.activityId !== data.activityId) {
        return NextResponse.json({ error: "Folder induk tidak valid" }, { status: 400 });
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: data.name,
        activityId: data.activityId,
        parentId: data.parentId ?? null,
      },
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "CREATE",
      entity: "Folder",
      entityId: folder.id,
      details: `Created folder: ${folder.name}`,
    });

    return NextResponse.json(folder);
  } catch (err) {
    // Prisma unique constraint violation
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Nama folder sudah ada di lokasi ini" }, { status: 409 });
    }
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("POST /api/dokumentasi/folders", err);
    return NextResponse.json({ error: "Gagal membuat folder" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, name } = folderUpdateSchema.parse(body);

    if (!name) {
      return NextResponse.json({ error: "Nama folder wajib diisi" }, { status: 400 });
    }

    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.folder.update({ where: { id }, data: { name } });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "Folder",
      entityId: id,
      details: `Renamed folder: ${folder.name} → ${updated.name}`,
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Nama folder sudah ada di lokasi ini" }, { status: 409 });
    }
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("PUT /api/dokumentasi/folders", err);
    return NextResponse.json({ error: "Gagal mengubah folder" }, { status: 500 });
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

    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });
    }

    // Collect all descendant folder IDs (including this one)
    const allFolderIds = await collectDescendantIds(id);

    // Delete all R2 files in these folders
    const mediaList = await prisma.media.findMany({
      where: { folderId: { in: allFolderIds } },
      select: { r2Key: true },
    });
    await Promise.all(mediaList.map((m) => deleteFromR2(m.r2Key).catch(() => null)));

    // Delete folder (DB cascade removes child folders; Media folderId → SET NULL via FK but we already deleted them)
    await prisma.media.deleteMany({ where: { folderId: { in: allFolderIds } } });
    await prisma.folder.delete({ where: { id } });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "DELETE",
      entity: "Folder",
      entityId: id,
      details: `Deleted folder "${folder.name}" with ${mediaList.length} media files`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE /api/dokumentasi/folders", err);
    return NextResponse.json({ error: "Gagal menghapus folder" }, { status: 500 });
  }
}
