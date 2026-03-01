import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireDocOrAdmin } from "@/lib/auth";
import { mediaCreateSchema, mediaUpdateSchema } from "@/lib/validations";
import { deleteFromR2 } from "@/lib/r2";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const activityId = searchParams.get("activityId");
    const folderId = searchParams.get("folderId");
    const filterDate = searchParams.get("date"); // YYYY-MM
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0") || 0);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24") || 24));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (activityId) where.activityId = activityId;
    if (folderId) {
      where.folderId = folderId; // isi folder tertentu
    } else if (activityId) {
      where.folderId = null; // hanya activity root (folderId IS NULL)
    }
    // Jika tidak ada activityId dan tidak ada folderId (mode "Semua"):
    // tidak tambahkan filter folderId → tampil semua media dari semua folder
    if (filterDate && /^\d{4}-\d{2}$/.test(filterDate)) {
      where.createdAt = {
        gte: new Date(`${filterDate}-01T00:00:00.000Z`),
        lt: new Date(
          new Date(`${filterDate}-01T00:00:00.000Z`).setMonth(
            new Date(`${filterDate}-01T00:00:00.000Z`).getMonth() + 1
          )
        ),
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { activity: { select: { name: true } } },
        skip,
        take: limit,
      }),
      prisma.media.count({ where }),
    ]);

    return NextResponse.json({ items, hasMore: skip + items.length < total });
  } catch (err) {
    logError("GET /api/dokumentasi/media", err);
    return NextResponse.json({ error: "Gagal mengambil data media" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = mediaCreateSchema.parse(body);
    const media = await prisma.media.create({
      data: {
        ...data,
        uploadedBy: auth.user.id,
        uploaderName: auth.user.name,
      },
    });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "CREATE",
      entity: "Media",
      entityId: media.id,
      details: `Uploaded ${media.fileType}: ${media.r2Key}`,
    });
    return NextResponse.json(media);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("POST /api/dokumentasi/media", err);
    return NextResponse.json({ error: "Gagal menyimpan media" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const data = mediaUpdateSchema.parse(body);

    const media = await prisma.media.findUnique({ where: { id: data.id } });
    if (!media) {
      return NextResponse.json({ error: "Media tidak ditemukan" }, { status: 404 });
    }

    const { role, id: userId } = auth.user;
    if (role === "dokumentasi" && media.uploadedBy !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.media.update({
      where: { id: data.id },
      data: { title: data.title ?? media.title },
      include: { activity: { select: { name: true } } },
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "UPDATE",
      entity: "Media",
      entityId: updated.id,
      details: `Updated title: ${updated.title}`,
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    logError("PUT /api/dokumentasi/media", err);
    return NextResponse.json({ error: "Gagal menyimpan judul" }, { status: 500 });
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

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Media tidak ditemukan" }, { status: 404 });
    }

    const { role, id: userId } = auth.user;
    if (role === "bendahara") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (role === "dokumentasi" && media.uploadedBy !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteFromR2(media.r2Key);
    await prisma.media.delete({ where: { id } });
    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "DELETE",
      entity: "Media",
      entityId: id,
      details: `Deleted media: ${media.r2Key}`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    logError("DELETE /api/dokumentasi/media", err);
    return NextResponse.json({ error: "Gagal menghapus media" }, { status: 500 });
  }
}
