import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await prisma.churchInfo.findMany();
    const result: Record<string, string> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil pengaturan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(body)) {
      if (typeof key !== "string" || typeof value !== "string") continue;
      await prisma.churchInfo.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
