import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { auditLog } from "@/lib/audit";
import { spawn } from "child_process";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL tidak dikonfigurasi" }, { status: 500 });
    }

    const parsed = new URL(dbUrl);
    const pgHost = parsed.hostname;
    const pgPort = parsed.port || "5432";
    const pgUser = parsed.username;
    const pgPassword = decodeURIComponent(parsed.password);
    const pgDatabase = parsed.pathname.replace(/^\//, "");

    await auditLog({
      userId: auth.user.id,
      userName: auth.user.name,
      action: "BACKUP",
      entity: "Database",
      entityId: "pg_dump",
      details: `Backup database: ${pgDatabase}`,
    });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `backup-${today}.sql`;

    const stream = new ReadableStream({
      start(controller) {
        const pg = spawn(
          "pg_dump",
          ["--no-owner", "--no-acl", "--clean", "--if-exists", "-Fp", pgDatabase],
          {
            env: {
              ...process.env,
              PGPASSWORD: pgPassword,
              PGHOST: pgHost,
              PGPORT: pgPort,
              PGUSER: pgUser,
            },
          }
        );

        pg.stdout.on("data", (chunk: Buffer) => {
          controller.enqueue(chunk);
        });

        pg.stderr.on("data", (chunk: Buffer) => {
          console.error("[pg_dump stderr]", chunk.toString());
        });

        pg.on("close", (code) => {
          if (code === 0) {
            controller.close();
          } else {
            controller.error(new Error(`pg_dump exited with code ${code}`));
          }
        });

        pg.on("error", (err) => {
          controller.error(err);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr?.code === "ENOENT") {
      return NextResponse.json(
        { error: "pg_dump tidak ditemukan. Pastikan postgresql-client terinstall." },
        { status: 500 }
      );
    }
    logError("GET /api/backup", err);
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}
