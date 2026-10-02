import { NextRequest, NextResponse } from "next/server";
import { getOrCreateRequestId, writeServerLog } from "@/lib/server/logger";

const API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://reposnse-ishaara.onrender.com";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getOrCreateRequestId(req.headers.get("x-request-id"));
  const url = new URL(req.url);
  const checkDependencies = url.searchParams.get("full") === "true";

  const responseHeaders = {
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  const liveness = {
    status: "ok",
    service: "ishaara-web-dashboard",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    requestId,
  };

  if (!checkDependencies) {
    writeServerLog({
      timestamp: new Date().toISOString(),
      level: "info",
      requestId,
      route: "/api/health",
      method: "GET",
      status: 200,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(liveness, {
      status: 200,
      headers: responseHeaders,
    });
  }

  // Bounded check for upstream backend readiness (timeout: 3.5s)
  let backendStatus = "UNAVAILABLE";
  let backendLatencyMs = 0;
  const backendStart = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    backendLatencyMs = Date.now() - backendStart;

    // Upstream 401/403 or 200 confirms the backend service is awake and processing HTTP requests
    if (res.status === 200 || res.status === 401 || res.status === 403) {
      backendStatus = "HEALTHY";
    } else {
      backendStatus = "DEGRADED";
    }
  } catch {
    backendLatencyMs = Date.now() - backendStart;
    backendStatus = "UNAVAILABLE";
  }

  const overallStatus = backendStatus === "HEALTHY" ? "ok" : "degraded";

  writeServerLog({
    timestamp: new Date().toISOString(),
    level: overallStatus === "ok" ? "info" : "warn",
    requestId,
    route: "/api/health?full=true",
    method: "GET",
    status: 200,
    durationMs: Date.now() - startTime,
    errorCode: overallStatus !== "ok" ? "BACKEND_DEGRADED" : undefined,
  });

  return NextResponse.json(
    {
      ...liveness,
      status: overallStatus,
      dependencies: {
        backendApi: {
          target: "https://reposnse-ishaara.onrender.com",
          status: backendStatus,
          latencyMs: backendLatencyMs,
        },
        authCorsEndpoint: {
          target: "/api/auth/email-otp/send-verification-otp",
          status: "KNOWN_EXTERNAL_DEPENDENCY",
          issueId: "BACKEND-AUTH-CORS-001",
          severity: "HIGH",
        },
      },
    },
    {
      status: 200,
      headers: responseHeaders,
    }
  );
}
