import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { requireAdmin } from "@/lib/auth";
import { getDbPath } from "@/lib/db-path";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const dbPath = getDbPath();
    const dbBuffer = readFileSync(dbPath);

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const filename = `backup_gbi_${dateStr}.db`;

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "BACKUP",
      entity: "Database",
      entityId: filename,
      details: `Backup database: ${filename}`,
    });

    return new NextResponse(dbBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(dbBuffer.length),
      },
    });
  } catch (err) {
    logError("GET /api/backup", err);
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}
