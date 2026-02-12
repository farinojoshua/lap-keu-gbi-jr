import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { requireAdmin } from "@/lib/auth";

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

    const dbPath = join(process.cwd(), "prisma", "dev.db");
    const backupDir = join(process.cwd(), "prisma", "backups");

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

    return NextResponse.json({
      success: true,
      message: "Database berhasil dipulihkan",
      autoBackup: `pre_restore_${timestamp}.db`,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memulihkan database" }, { status: 500 });
  }
}
