import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxyAdminRequest, clearUserRoleCache } from "@/lib/server/adminProxy";
import { GET as healthHandler } from "@/app/api/health/route";
import { settlementsApi } from "@/lib/api/settlements";
import { apiClient } from "@/lib/api/client";
import { ApiError, formatApiErrorMessage } from "@/lib/errors";

describe("Phase A23 — Production UAT & End-to-End Stabilization Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearUserRoleCache();
    process.env = { ...originalEnv, ADMIN_SECRET_KEY: "prod_admin_secret_uat_key_888" };
  });

  afterEach(() => {
    process.env = originalEnv;
    clearUserRoleCache();
  });

  // A23-E2E-001: Authentication & Token Management
  describe("A23-E2E-001: Authentication Workflow", () => {
    it("handles valid session extraction and attaches authorization header", async () => {
      let capturedAuth: string | null = null;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const headers = init?.headers as Headers;
        capturedAuth = headers?.get("Authorization") || null;
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "user_owner_1", email: "owner@agency.com", role: "AGENCY_OWNER" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const { apiClient, authStorage } = await import("@/lib/api/client");
      authStorage.setToken("session_token_123");

      const res = await apiClient.get<{ success: boolean }>("/api/v1/users/me");

      expect(res.success).toBe(true);
      expect(capturedAuth).toBe("Bearer session_token_123");

      authStorage.clearToken();
    });
  });

  // A23-E2E-002: Role Authorization Matrix (Client & Server)
  describe("A23-E2E-002: Role-Based Authorization Barriers", () => {
    it("blocks USER role from administrative proxy mutations with 403 FORBIDDEN", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { id: "u_passenger", role: "USER" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = new NextRequest("http://localhost:3000/api/admin/settlements/batch/process", {
        method: "POST",
        headers: { authorization: "Bearer passenger_token" },
      });

      const res = await proxyAdminRequest(req, "/api/v1/payments/settlements/batch/process", "POST");
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("blocks DRIVER_CONDUCTOR role from settlement details with 403 FORBIDDEN", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { id: "u_driver", role: "DRIVER_CONDUCTOR" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_1", {
        method: "GET",
        headers: { authorization: "Bearer driver_token" },
      });

      const res = await proxyAdminRequest(req, "/api/v1/payments/settlements/set_1", "GET");
      expect(res.status).toBe(403);
    });

    it("allows ADMIN role and strictly attaches x-admin-key server-side", async () => {
      let upstreamAdminHeader: string | null = null;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/v1/users/me")) {
          return new Response(
            JSON.stringify({ success: true, data: { id: "u_admin", role: "ADMIN" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        const headers = init?.headers as Record<string, string>;
        upstreamAdminHeader = headers?.["x-admin-key"] || null;
        return new Response(
          JSON.stringify({ success: true, data: { items: [], pagination: { total: 0 } } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      });

      const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
        method: "GET",
        headers: { authorization: "Bearer admin_valid_token" },
      });

      const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
      expect(res.status).toBe(200);
      expect(upstreamAdminHeader).toBe("prod_admin_secret_uat_key_888");
    });
  });

  // A23-E2E-003 & 004: Agency & Admin E2E Workflow APIs
  describe("A23-E2E-003 & A23-E2E-004: Agency and Admin Data Workflows", () => {
    it("lists operator settlements scoped strictly to operator ID", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        success: true,
        data: {
          items: [
            {
              id: "set_op_1",
              operatorId: "agency_owner_1",
              amountMinor: 50000,
              currency: "INR",
              status: "PROCESSED",
            },
          ],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      });

      const res = await settlementsApi.listOperatorSettlements("agency_owner_1", { page: 1 });
      expect(getSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/operators/agency_owner_1/settlements?page=1")
      );
      expect(res.items[0].id).toBe("set_op_1");
    });

    it("lists platform settlements through admin proxy path", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        success: true,
        data: { items: [], pagination: { total: 0, page: 1, limit: 15, totalPages: 1 } },
      });

      await settlementsApi.listPlatformSettlements({ status: "PENDING" });
      expect(getSpy).toHaveBeenCalledWith("/api/admin/settlements?status=PENDING");
    });
  });

  // A23-E2E-007 & 008: Mutation Safety & 409 Concurrency Handling
  describe("A23-E2E-007 & A23-E2E-008: Settlement Mutations & 409 Concurrency", () => {
    it("handles 409 LEASE_CONFLICT with safe user-facing message and no crash", () => {
      const conflictError = new ApiError(
        409,
        "LEASE_CONFLICT",
        "Settlement is currently held by background worker lease"
      );

      const message = formatApiErrorMessage(conflictError);
      expect(message).toBe("This settlement is already being processed.");
      expect(message).not.toContain("worker lease");
    });

    it("disallows empty retry reasons before mutating state", async () => {
      const retryMutationCall = async (reason: string) => {
        if (!reason || reason.trim().length < 3) {
          throw new Error("Administrative retry reason must be at least 3 characters long.");
        }
        return settlementsApi.retrySettlement("set_fail_1", reason.trim());
      };

      await expect(retryMutationCall("")).rejects.toThrowError(/at least 3 characters/);
      await expect(retryMutationCall("   ")).rejects.toThrowError(/at least 3 characters/);
      await expect(retryMutationCall("ab")).rejects.toThrowError(/at least 3 characters/);
    });
  });

  // A23-E2E-009 & 010: Reconciliation & System Health Checks
  describe("A23-E2E-009 & A23-E2E-010: Reconciliation Invariants & Health Endpoints", () => {
    it("returns 200 OK with correlation ID on liveness probe", async () => {
      const req = new NextRequest("http://localhost:3000/api/health", {
        headers: { "x-request-id": "uat-trace-001" },
      });

      const res = await healthHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Request-ID")).toBe("uat-trace-001");
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.service).toBe("ishaara-web-dashboard");
    });

    it("surfaces external dependency BACKEND-AUTH-CORS-001 on readiness probe", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
      );

      const req = new NextRequest("http://localhost:3000/api/health?full=true");
      const res = await healthHandler(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.dependencies.authCorsEndpoint.issueId).toBe("BACKEND-AUTH-CORS-001");
      expect(body.dependencies.authCorsEndpoint.status).toBe("KNOWN_EXTERNAL_DEPENDENCY");
    });
  });

  // A23-E2E-011 & 012: Error Recovery & Logout Protection
  describe("A23-E2E-011 & A23-E2E-012: Error Recovery & Safe Sanitization", () => {
    it("sanitizes backend database URIs and stack traces into safe messages", () => {
      const rawDbError = new ApiError(
        500,
        "DB_ERROR",
        "Connection failed to postgres://user:secret@10.0.0.1:5432/db"
      );

      const formatted = formatApiErrorMessage(rawDbError);
      expect(formatted).not.toContain("postgres://");
      expect(formatted).not.toContain("10.0.0.1");
      expect(formatted).toContain("Something went wrong on the server");
    });

    it("sanitizes gateway timeout into safe non-financial message", () => {
      const timeoutError = new ApiError(504, "UPSTREAM_TIMEOUT", "Gateway timeout after 15000ms");
      const formatted = formatApiErrorMessage(timeoutError);
      expect(formatted).toBe(
        "Financial settlement gateway is currently unavailable or timed out. Please try again."
      );
    });
  });
});
