import { NextRequest, NextResponse } from "next/server";
import { requireDocOrAdmin } from "@/lib/auth";
import { uploadUrlRequestSchema } from "@/lib/validations";
import { createPresignedPutUrl } from "@/lib/r2";
import { logError } from "@/lib/logger";

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req: NextRequest) {
  const auth = await requireDocOrAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { activityId, folderId, contentType } = uploadUrlRequestSchema.parse(body);

    const ext = EXT_MAP[contentType] ?? "bin";
    const r2Key = folderId
      ? `dokumentasi/${activityId}/${folderId}/${Date.now()}-${randomSuffix()}.${ext}`
      : `dokumentasi/${activityId}/${Date.now()}-${randomSuffix()}.${ext}`;
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;

    const presignedUrl = await createPresignedPutUrl(r2Key, contentType);

    return NextResponse.json({ presignedUrl, r2Key, publicUrl });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Data tidak valid atau tipe file tidak diizinkan" }, { status: 400 });
    }
    logError("POST /api/dokumentasi/upload-url", err);
    return NextResponse.json({ error: "Gagal membuat upload URL" }, { status: 500 });
  }
}
