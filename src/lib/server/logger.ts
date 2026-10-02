export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  errorCode?: string;
  actorRole?: string;
  operationType?: string;
  resourceType?: string;
  resourceId?: string;
  message?: string;
}

/**
 * Redaction pattern list to prevent accidental secret or credential leakage in server logs
 */
const SENSITIVE_PATTERNS = [
  /(\\?["']?(?:admin_secret_key|x-admin-key|password|secret|token|otp)\\?["']?\s*[:=]\s*\\?["']?)([^"',\s\\}]+)(\\?["']?)/gi,
  /bearer\s+[a-zA-Z0-9_.\-]+/gi,
  /postgres:\/\/[^:]+:[^@]+@/gi,
  /mysql:\/\/[^:]+:[^@]+@/gi,
];

/**
 * Sanitizes any raw string content to scrub secrets, bearer tokens, or database URIs
 */
export function redactSensitiveData(input: string): string {
  if (!input || typeof input !== "string") return input;
  let redacted = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, (match, p1, p2, p3) => {
      if (match.toLowerCase().startsWith("bearer ")) {
        return "Bearer [REDACTED]";
      }
      if (match.includes("://")) {
        return match.replace(/:[^:@]+@/, ":[REDACTED]@");
      }
      return `${p1}[REDACTED]${p3 || ""}`;
    });
  }
  return redacted;
}

/**
 * Generates an opaque, time-sortable random request ID (e.g. req_...)
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${randomPart}`;
}

/**
 * Extracts or generates X-Request-ID from incoming request
 */
export function getOrCreateRequestId(headerValue?: string | null): string {
  if (headerValue && /^[a-zA-Z0-9_\-.]{8,64}$/.test(headerValue.trim())) {
    return headerValue.trim();
  }
  return generateRequestId();
}

/**
 * Formats and emits a single-line JSON log entry to stdout / stderr
 */
export function writeServerLog(payload: Omit<LogPayload, "service" | "environment">): void {
  const fullPayload: LogPayload = {
    ...payload,
    service: "ishaara-web-dashboard",
    environment: process.env.NODE_ENV || "development",
  };

  const serialized = JSON.stringify(fullPayload);
  const safeSerialized = redactSensitiveData(serialized);

  if (payload.level === "error") {
    console.error(safeSerialized);
  } else if (payload.level === "warn") {
    console.warn(safeSerialized);
  } else {
    console.log(safeSerialized);
  }
}
