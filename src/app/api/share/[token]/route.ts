import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Subfolder navigation dari dalam share page
  const folderId = req.nextUrl.searchParams.get("folderId");
  if (folderId) {
    const shareLink = await prisma.shareLink.findUnique({ where: { token } });
    if (!shareLink) return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) return NextResponse.json({ error: "Folder tidak ditemukan" }, { status: 404 });

    // Pastikan folder masih dalam scope share link (cukup cek activityId)
    const sharedActivityId =
      shareLink.type === "activity"
        ? shareLink.activityId
        : shareLink.folderId
        ? (await prisma.folder.findUnique({ where: { id: shareLink.folderId } }))?.activityId
        : null;

    if (!sharedActivityId || folder.activityId !== sharedActivityId) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const [subfolders, media] = await Promise.all([
      prisma.folder.findMany({ where: { parentId: folderId }, orderBy: { createdAt: "asc" } }),
      prisma.media.findMany({ where: { folderId }, orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({ subfolders, media });
  }

  const shareLink = await prisma.shareLink.findUnique({ where: { token } });
  if (!shareLink) {
    return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });
  }

  if (shareLink.type === "activity" && shareLink.activityId) {
    const activity = await prisma.activity.findUnique({
      where: { id: shareLink.activityId },
    });
    if (!activity) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

    const [folders, media] = await Promise.all([
      prisma.folder.findMany({
        where: { activityId: shareLink.activityId, parentId: null },
        orderBy: { createdAt: "asc" },
      }),
      prisma.media.findMany({
        where: { activityId: shareLink.activityId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ type: "activity", activity, folders, media });
  }

  if (shareLink.type === "folder" && shareLink.folderId) {
    const folder = await prisma.folder.findUnique({
      where: { id: shareLink.folderId },
      include: { activity: true },
    });
    if (!folder) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

    const [subfolders, media] = await Promise.all([
      prisma.folder.findMany({
        where: { parentId: shareLink.folderId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.media.findMany({
        where: { folderId: shareLink.folderId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ type: "folder", folder, subfolders, media });
  }

  if (shareLink.type === "media" && shareLink.mediaId) {
    const media = await prisma.media.findUnique({
      where: { id: shareLink.mediaId },
      include: {
        activity: true,
        folder: true,
      },
    });
    if (!media) return NextResponse.json({ error: "Konten tidak ditemukan" }, { status: 404 });

    return NextResponse.json({ type: "media", media });
  }

  return NextResponse.json({ error: "Link tidak valid" }, { status: 400 });
}
