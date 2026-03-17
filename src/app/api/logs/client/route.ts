import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appLogger } from "@/lib/logger";

const ClientLogSchema = z.object({
  level: z.enum(["error", "warn", "info"]).default("error"),
  message: z.string().min(1).max(4000),
  source: z.string().default("frontend"),
  path: z.string().optional(),
  userAgent: z.string().optional(),
  stack: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const payload = ClientLogSchema.parse(json);

    const meta = {
      source: payload.source,
      path: payload.path,
      userAgent: payload.userAgent,
      stack: payload.stack,
      meta: payload.meta,
      ip: req.headers.get("x-forwarded-for") || "unknown",
    };

    if (payload.level === "error") appLogger.error(meta, payload.message);
    else if (payload.level === "warn") appLogger.warn(meta, payload.message);
    else appLogger.info(meta, payload.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    appLogger.error({ err: error }, "client_log_ingest_failed");
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
