import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { shareLinkCreateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { type, targetId } = shareLinkCreateSchema.parse(body);

    // Validasi target exists dan build FK fields
    let activityId: string | null = null;
    let folderId: string | null = null;
    let mediaId: string | null = null;

    if (type === "activity") {
      const activity = await prisma.activity.findUnique({ where: { id: targetId } });
      if (!activity) return NextResponse.json({ error: "Activity tidak ditemukan" }, { status: 404 });
      activityId = targetId;
    } else if (type === "folder") {
      const folder = await prisma.folder.findUnique({ where: { id: targetId } });
      if (!folder) return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });
      folderId = targetId;
    } else {
      const media = await prisma.media.findUnique({ where: { id: targetId } });
      if (!media) return NextResponse.json({ error: "Media tidak ditemukan" }, { status: 404 });
      mediaId = targetId;
    }

    // Idempotent: cek apakah sudah ada link untuk target ini
    const existing = await prisma.shareLink.findFirst({
      where: { type, activityId, folderId, mediaId },
    });

    if (existing) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      return NextResponse.json({ token: existing.token, url: `${baseUrl}/share/${existing.token}` });
    }

    // Buat token baru
    const token = randomBytes(8).toString("hex");
    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        type,
        activityId: activityId ?? undefined,
        folderId: folderId ?? undefined,
        mediaId: mediaId ?? undefined,
        createdBy: auth.user.id,
      },
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "CREATE",
      entity: "ShareLink",
      entityId: shareLink.id,
      details: `Membuat share link untuk ${type}: ${targetId}`,
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.json({ token: shareLink.token, url: `${baseUrl}/share/${shareLink.token}` });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    console.error("[SHARE_LINKS_POST]", err);
    return NextResponse.json({ error: "Gagal membuat share link" }, { status: 500 });
  }
}
