import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const dbPath = join(process.cwd(), "prisma", "dev.db");
    const dbBuffer = readFileSync(dbPath);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const filename = `backup_gbi_${dateStr}.db`;

    return new NextResponse(dbBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(dbBuffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}
