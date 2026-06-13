import { genericTelemetryError } from "./safe-error";

type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    genericTelemetryError(),
    {
      source: "react_error_boundary",
      route: sanitizeRouteForTelemetry(window.location.pathname),
      originalErrorType: error instanceof Error ? error.name : "unknown",
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}

function sanitizeRouteForTelemetry(pathname: string): string {
  if (pathname.startsWith("/r/")) return "/r/:slug";
  if (pathname.startsWith("/lugar/")) return "/lugar/:slug";
  return pathname.slice(0, 120);
}
