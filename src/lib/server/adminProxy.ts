import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId, writeServerLog } from "./logger";

const API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://reposnse-ishaara.onrender.com";

// In-memory role cache with 30s TTL to prevent auth latency amplification on consecutive admin calls
const userRoleCache = new Map<string, { role: string; expiresAt: number }>();

export function clearUserRoleCache(): void {
  userRoleCache.clear();
}

/**
 * Validates settlement ID structure to block malformed or path traversal injection attempts
 */
export function isValidSettlementId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[a-zA-Z0-9_-]{3,64}$/.test(id.trim());
}

/**
 * Authoritatively verifies that the caller's session token corresponds to an active ADMIN user
 */
export async function verifyAdminSession(
  authHeader: string,
  requestId?: string
): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; status: number; code: string; message: string }
> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return {
      authorized: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required. Bearer session token is empty.",
    };
  }

  const cached = userRoleCache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    if (cached.role === "ADMIN") {
      return { authorized: true, userId: "cached_admin" };
    } else {
      return {
        authorized: false,
        status: 403,
        code: "FORBIDDEN",
        message: "Administrative role required. Access denied for this session.",
      };
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };
    if (requestId) {
      headers["X-Request-ID"] = requestId;
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 401) {
      return {
        authorized: false,
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication session expired or invalid. Please sign in again.",
      };
    }

    if (!res.ok) {
      return {
        authorized: false,
        status: 403,
        code: "AUTH_VERIFICATION_FAILED",
        message: "Failed to verify administrative authorization with authentication service.",
      };
    }

    const json = await res.json();
    const role = json.data?.role || json.role;

    if (role === "ADMIN") {
      userRoleCache.set(token, { role: "ADMIN", expiresAt: Date.now() + 30000 });
      return { authorized: true, userId: json.data?.id || json.id || "admin" };
    }

    // Cache non-admin to prevent privilege escalation brute force
    userRoleCache.set(token, { role: role || "NON_ADMIN", expiresAt: Date.now() + 30000 });

    return {
      authorized: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Administrative role required. Access denied for this session.",
    };
  } catch {
    return {
      authorized: false,
      status: 502,
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "Authentication verification service unavailable. Please try again later.",
    };
  }
}

export async function proxyAdminRequest(
  req: NextRequest,
  upstreamPath: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  bodyPayload?: unknown
) {
  const startTime = Date.now();
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    writeServerLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      requestId,
      route: req.nextUrl?.pathname || upstreamPath,
      method,
      status: 401,
      durationMs: Date.now() - startTime,
      errorCode: "UNAUTHORIZED",
      message: "Admin request rejected: authorization header missing",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Admin session token missing.",
          requestId,
        },
      },
      {
        status: 401,
        headers: { "X-Request-ID": requestId },
      }
    );
  }

  // 1. Authoritative Role Verification on Server (Blocks non-admins from reaching upstream)
  const authCheck = await verifyAdminSession(authHeader, requestId);
  if (!authCheck.authorized) {
    writeServerLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      requestId,
      route: req.nextUrl?.pathname || upstreamPath,
      method,
      status: authCheck.status,
      durationMs: Date.now() - startTime,
      errorCode: authCheck.code,
      message: "Admin request rejected: role verification failed",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: authCheck.code,
          message: authCheck.message,
          requestId,
        },
      },
      {
        status: authCheck.status,
        headers: { "X-Request-ID": requestId },
      }
    );
  }

  // 2. Administrative Secret Configuration Check
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey) {
    writeServerLog({
      timestamp: new Date().toISOString(),
      level: "error",
      requestId,
      route: req.nextUrl?.pathname || upstreamPath,
      method,
      status: 503,
      durationMs: Date.now() - startTime,
      errorCode: "ADMIN_KEY_NOT_CONFIGURED",
      actorRole: "ADMIN",
      message: "Server environment missing ADMIN_SECRET_KEY",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_KEY_NOT_CONFIGURED",
          message:
            "Administrative secret key is not configured in server environment. Admin operations are blocked.",
          requestId,
        },
      },
      {
        status: 503,
        headers: { "X-Request-ID": requestId },
      }
    );
  }

  const upstreamUrl = `${API_BASE_URL}${upstreamPath}`;

  const headers: Record<string, string> = {
    Authorization: authHeader,
    "x-admin-key": adminKey,
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (bodyPayload !== undefined && method !== "GET") {
      fetchOptions.body = JSON.stringify(bodyPayload);
    }

    const upstreamRes = await fetch(upstreamUrl, fetchOptions);
    clearTimeout(timeoutId);

    const contentType = upstreamRes.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await upstreamRes.json() : await upstreamRes.text();

    const durationMs = Date.now() - startTime;
    const isError = upstreamRes.status >= 400;

    // Log the operational metrics
    writeServerLog({
      timestamp: new Date().toISOString(),
      level: upstreamRes.status >= 500 ? "error" : upstreamRes.status >= 400 ? "warn" : "info",
      requestId,
      route: req.nextUrl?.pathname || upstreamPath,
      method,
      status: upstreamRes.status,
      durationMs,
      errorCode: isError
        ? typeof data === "object" && data !== null && "error" in data
          ? (data as { error: { code?: string } }).error?.code
          : `HTTP_${upstreamRes.status}`
        : undefined,
      actorRole: "ADMIN",
      operationType: method === "GET" ? "QUERY" : "MUTATION",
    });

    // Attach X-Request-ID header to outbound client response
    const clientResponse = NextResponse.json(data, { status: upstreamRes.status });
    clientResponse.headers.set("X-Request-ID", requestId);
    return clientResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (err instanceof Error && err.name === "AbortError") {
      writeServerLog({
        timestamp: new Date().toISOString(),
        level: "error",
        requestId,
        route: req.nextUrl?.pathname || upstreamPath,
        method,
        status: 504,
        durationMs,
        errorCode: "UPSTREAM_TIMEOUT",
        actorRole: "ADMIN",
        message: "Financial settlement gateway request timed out after 15000ms",
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UPSTREAM_TIMEOUT",
            message: "Request to financial settlement gateway timed out. No funds deducted.",
            requestId,
          },
        },
        {
          status: 504,
          headers: { "X-Request-ID": requestId },
        }
      );
    }

    writeServerLog({
      timestamp: new Date().toISOString(),
      level: "error",
      requestId,
      route: req.nextUrl?.pathname || upstreamPath,
      method,
      status: 502,
      durationMs,
      errorCode: "GATEWAY_ERROR",
      actorRole: "ADMIN",
      message: "Gateway communication failure with financial backend",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GATEWAY_ERROR",
          message: "Failed to communicate with financial settlement backend. Please try again later.",
          requestId,
        },
      },
      {
        status: 502,
        headers: { "X-Request-ID": requestId },
      }
    );
  }
}

