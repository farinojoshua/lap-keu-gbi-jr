import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { requireAdmin } from "@/lib/auth";
import { getDbPath } from "@/lib/db-path";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File diperlukan" }, { status: 400 });
    }

    // Limit file size to 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file melebihi batas 50MB" }, { status: 400 });
    }

    // Validate it's a SQLite file by checking the header
    const buffer = Buffer.from(await file.arrayBuffer());
    const header = buffer.subarray(0, 16).toString("utf-8");
    if (!header.startsWith("SQLite format 3")) {
      return NextResponse.json({ error: "File bukan database SQLite yang valid" }, { status: 400 });
    }

    const dbPath = getDbPath();
    const backupDir = join(dirname(dbPath), "backups");

    // Create a backup of the current database before overwriting
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const autoBackupPath = join(backupDir, `pre_restore_${timestamp}.db`);

    if (existsSync(dbPath)) {
      copyFileSync(dbPath, autoBackupPath);
    }

    // Write the uploaded file as the new database
    writeFileSync(dbPath, buffer);

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "RESTORE",
      entity: "Database",
      entityId: `pre_restore_${timestamp}.db`,
      details: `Restore database, auto-backup: pre_restore_${timestamp}.db`,
    });

    return NextResponse.json({
      success: true,
      message: "Database berhasil dipulihkan",
      autoBackup: `pre_restore_${timestamp}.db`,
    });
  } catch (err) {
    logError("POST /api/restore", err);
    return NextResponse.json({ error: "Gagal memulihkan database" }, { status: 500 });
  }
}
