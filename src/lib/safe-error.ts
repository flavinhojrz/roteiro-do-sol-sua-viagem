const SECRET_PATTERNS = [
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /https?:\/\/[^\s)"']+/gi,
];

export function toSafeErrorLog(error: unknown): { name: string; message: string } {
  const name = error instanceof Error ? error.name : "UnknownError";
  const rawMessage = error instanceof Error ? error.message : String(error);
  return {
    name: sanitizeLogText(name, 80),
    message: sanitizeLogText(rawMessage, 500),
  };
}

export function genericTelemetryError(): Error {
  return new Error("Client rendering error");
}

function sanitizeLogText(value: string, maxLength: number): string {
  let sanitized = value;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[redacted]");
  }
  return sanitized.replace(/[\r\n\t]+/g, " ").slice(0, maxLength);
}
