import pino from "pino";

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

export const appLogger = pino({
  level,
  base: {
    app: "lap-keu-gbi-jr",
    env: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function logError(context: string, error: unknown, extra: Record<string, unknown> = {}) {
  appLogger.error(
    {
      context,
      err: error,
      ...extra,
    },
    "request_failed",
  );
}

export function logInfo(message: string, extra: Record<string, unknown> = {}) {
  appLogger.info(extra, message);
}
