"use client";

import { useEffect } from "react";

async function pushLog(body: Record<string, unknown>) {
  try {
    await fetch("/api/logs/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // no-op
  }
}

export default function ClientLogBridge() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void pushLog({
        level: "error",
        message: event.message || "window_error",
        source: "frontend",
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        stack: event.error?.stack,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      void pushLog({
        level: "error",
        message: "unhandled_rejection",
        source: "frontend",
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        stack: typeof reason === "object" && reason?.stack ? reason.stack : String(reason),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
