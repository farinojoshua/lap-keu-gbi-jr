import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";
import { spawn } from "child_process";

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (!file.name.endsWith(".sql")) {
      return NextResponse.json({ error: "File harus berekstensi .sql" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file melebihi batas 100MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL tidak dikonfigurasi" }, { status: 500 });
    }

    const parsed = new URL(dbUrl);
    const pgEnv = {
      ...process.env,
      PGPASSWORD: decodeURIComponent(parsed.password),
      PGHOST: parsed.hostname,
      PGPORT: parsed.port || "5432",
      PGUSER: parsed.username,
      PGDATABASE: parsed.pathname.replace(/^\//, ""),
    };

    await new Promise<void>((resolve, reject) => {
      const psql = spawn("psql", ["-v", "ON_ERROR_STOP=1"], {
        env: pgEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";

      psql.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      psql.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}: ${stderr}`));
        }
      });

      psql.on("error", (err) => {
        reject(err);
      });

      psql.stdin.write(buffer);
      psql.stdin.end();
    });

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "RESTORE",
      entity: "Database",
      entityId: "psql",
      details: `Restore dari file: ${file.name}`,
    });

    return NextResponse.json({ success: true, message: "Database berhasil di-restore" });
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr?.code === "ENOENT") {
      return NextResponse.json(
        { error: "psql tidak ditemukan. Pastikan postgresql-client terinstall." },
        { status: 500 }
      );
    }
    logError("POST /api/restore", err);
    const message = err instanceof Error ? err.message : "Gagal memulihkan database";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
