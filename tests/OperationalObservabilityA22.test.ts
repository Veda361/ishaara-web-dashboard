import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthHandler } from "@/app/api/health/route";
import { redactSensitiveData, generateRequestId, getOrCreateRequestId, writeServerLog } from "@/lib/server/logger";
import { proxyAdminRequest, clearUserRoleCache } from "@/lib/server/adminProxy";

describe("Phase A22 — OperationalObservabilityTest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearUserRoleCache();
    process.env = { ...originalEnv, ADMIN_SECRET_KEY: "prod_admin_secret_key_777" };
  });

  afterEach(() => {
    process.env = originalEnv;
    clearUserRoleCache();
  });

  describe("A22-001 & A22-002: Secret Redaction & Logging", () => {
    it("redacts ADMIN_SECRET_KEY, Bearer tokens, and database connection strings from logs", () => {
      const rawLog = 'User with Bearer eyJhbGciOiJIUzI1NiJ9 attempted call with ADMIN_SECRET_KEY="super_secret_val" on postgres://postgres:password123@db.internal:5432/ishaara';
      const safe = redactSensitiveData(rawLog);

      expect(safe).not.toContain("super_secret_val");
      expect(safe).not.toContain("eyJhbGciOiJIUzI1NiJ9");
      expect(safe).not.toContain("password123");
      expect(safe).toContain("Bearer [REDACTED]");
      expect(safe).toContain('ADMIN_SECRET_KEY="[REDACTED]"');
      expect(safe).toContain("postgres://postgres:[REDACTED]@db.internal:5432/ishaara");
    });

    it("scrubs console error output without throwing exceptions", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      writeServerLog({
        timestamp: new Date().toISOString(),
        level: "error",
        requestId: "req_test_123",
        route: "/api/admin/settlements",
        method: "GET",
        status: 500,
        durationMs: 45,
        message: 'Failed to connect: ADMIN_SECRET_KEY="forbidden_secret"',
      });

      expect(errorSpy).toHaveBeenCalled();
      const loggedData = errorSpy.mock.calls[0][0];
      expect(loggedData).not.toContain("forbidden_secret");
      expect(loggedData).toContain("[REDACTED]");
    });
  });

  describe("A22-003: Request ID Correlation", () => {
    it("generates an opaque, structured request ID when header is missing", () => {
      const reqId = generateRequestId();
      expect(reqId).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
    });

    it("preserves incoming valid X-Request-ID and discards invalid ones", () => {
      const valid = getOrCreateRequestId("client-req-uuid-12345");
      expect(valid).toBe("client-req-uuid-12345");

      const malformed = getOrCreateRequestId("<script>bad</script>");
      expect(malformed).toMatch(/^req_/);
      expect(malformed).not.toContain("<script>");
    });
  });

  describe("A22-004 & A22-005: Health & Readiness Endpoint", () => {
    it("returns 200 OK with service metadata and X-Request-ID on liveness check", async () => {
      const req = new NextRequest("http://localhost:3000/api/health", {
        headers: { "x-request-id": "trace-uuid-111" },
      });

      const res = await healthHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Request-ID")).toBe("trace-uuid-111");

      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.service).toBe("ishaara-web-dashboard");
      expect(json.requestId).toBe("trace-uuid-111");
    });

    it("surfaces external dependency status without crashing on full readiness probe", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        if (String(url).includes("/api/v1/users/me")) {
          return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
        }
        return new Response("Not found", { status: 404 });
      });

      const req = new NextRequest("http://localhost:3000/api/health?full=true");
      const res = await healthHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.dependencies.backendApi.status).toBe("HEALTHY");
      expect(json.dependencies.authCorsEndpoint.issueId).toBe("BACKEND-AUTH-CORS-001");
      expect(json.dependencies.authCorsEndpoint.status).toBe("KNOWN_EXTERNAL_DEPENDENCY");
    });
  });

  describe("A22-008 & A22-011: Admin Proxy Observability & Correlation Propagation", () => {
    it("propagates X-Request-ID to upstream and client response on admin query", async () => {
      let upstreamReceivedRequestId: string | null = null;

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/users/me")) {
          return new Response(
            JSON.stringify({ success: true, data: { id: "admin_1", role: "ADMIN" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (urlStr.includes("/api/v1/payments/settlements")) {
          const headers = init?.headers as Record<string, string>;
          upstreamReceivedRequestId = headers["X-Request-ID"];
          return new Response(
            JSON.stringify({ success: true, data: { items: [] } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
        headers: {
          authorization: "Bearer mock_admin_token",
          "x-request-id": "client-correlation-999",
        },
      });

      const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Request-ID")).toBe("client-correlation-999");
      expect(upstreamReceivedRequestId).toBe("client-correlation-999");
    });

    it("attaches requestId to 401 UNAUTHORIZED responses for client trace correlation", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
        headers: {
          "x-request-id": "trace-unauth-001",
        },
      });

      const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
      expect(res.status).toBe(401);
      expect(res.headers.get("X-Request-ID")).toBe("trace-unauth-001");

      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.requestId).toBe("trace-unauth-001");
    });
  });
});
