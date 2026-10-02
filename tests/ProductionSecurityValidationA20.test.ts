import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxyAdminRequest, clearUserRoleCache, isValidSettlementId } from "@/lib/server/adminProxy";
import { formatApiErrorMessage, ApiError } from "@/lib/errors";
import { POST as retryHandler } from "@/app/api/admin/settlements/[settlementId]/retry/route";
import { POST as processHandler } from "@/app/api/admin/settlements/[settlementId]/process/route";

describe("Phase A20 — Comprehensive Production Security Validation Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearUserRoleCache();
    process.env = { ...originalEnv, ADMIN_SECRET_KEY: "mock_phase_a20_admin_secret_999" };
  });

  afterEach(() => {
    process.env = originalEnv;
    clearUserRoleCache();
  });

  // 1. Non-admin cannot access admin API
  it("A20-SEC-01: Non-admin users cannot access admin API and receive 403 FORBIDDEN", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: { id: "user_owner_1", role: "AGENCY_OWNER", email: "owner@agency.com" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
      method: "GET",
      headers: { authorization: "Bearer mock_owner_token" },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  // 2. Unauthenticated request receives 401
  it("A20-SEC-02: Unauthenticated request receives 401 UNAUTHORIZED", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
      method: "GET",
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  // 3. Admin request succeeds
  it("A20-SEC-03: Authenticated ADMIN request succeeds and attaches server secret", async () => {
    let capturedAdminHeader: string | null = null;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/v1/users/me")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "admin_master", role: "ADMIN", email: "admin@ishaara.internal" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/api/v1/payments/settlements")) {
        const headers = init?.headers as Record<string, string>;
        capturedAdminHeader = headers["x-admin-key"];
        return new Response(
          JSON.stringify({ success: true, data: { items: [], pagination: { total: 0 } } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
      method: "GET",
      headers: { authorization: "Bearer mock_valid_admin_token" },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(capturedAdminHeader).toBe("mock_phase_a20_admin_secret_999");
  });

  // 4. Missing ADMIN_SECRET_KEY returns 503
  it("A20-SEC-04: Missing ADMIN_SECRET_KEY returns 503 without leaking configuration details", async () => {
    delete process.env.ADMIN_SECRET_KEY;

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: { id: "admin_user", role: "ADMIN" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
      method: "GET",
      headers: { authorization: "Bearer mock_admin_token" },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("ADMIN_KEY_NOT_CONFIGURED");
    expect(JSON.stringify(body)).not.toContain("mock_phase_a20_admin_secret_999");
  });

  // 5. Malformed mutation body returns 400
  it("A20-SEC-05: Malformed mutation body returns 400 Bad Request", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_valid_123/retry", {
      method: "POST",
      body: "not-json-content",
    });

    const res = await retryHandler(req, {
      params: Promise.resolve({ settlementId: "set_valid_123" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_REQUEST_BODY");
  });

  // 6. Invalid retry reason returns 400
  it("A20-SEC-06: Missing or whitespace-only reason returns 400", async () => {
    const payloads = [{}, { reason: "" }, { reason: "   " }, { reason: "ab" }, { reason: null }];

    for (const payload of payloads) {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_valid_123/retry", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const res = await retryHandler(req, {
        params: Promise.resolve({ settlementId: "set_valid_123" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(["MISSING_RETRY_REASON", "INVALID_REASON_LENGTH"]).toContain(body.error.code);
    }
  });

  // 7. Upstream 409 is safely mapped
  it("A20-SEC-07: Upstream 409 Conflict maps to safe human-readable message", () => {
    const errorWithCode = new ApiError(
      409,
      "LEASE_CONFLICT",
      "Worker lock holds active lease for settlement set_420"
    );
    expect(formatApiErrorMessage(errorWithCode)).toBe(
      "This settlement is already being processed."
    );

    const genericConflict = new ApiError(
      409,
      "CONFLICT",
      "Settlement mutation collision detected"
    );
    expect(formatApiErrorMessage(genericConflict)).toBe(
      "This settlement is already being processed."
    );
  });

  // 8. Upstream 500/502 is sanitized
  it("A20-SEC-08: Upstream 500/502 and infrastructure exceptions are sanitized", () => {
    const errorWithSensitiveInfo = new ApiError(
      500,
      "INTERNAL_ERROR",
      "FATAL: connect to postgres://user:secretpass@10.0.0.5:5432 failed; ADMIN_SECRET_KEY=leak"
    );
    const message = formatApiErrorMessage(errorWithSensitiveInfo);
    expect(message).toBe("Something went wrong on the server. Please try again later.");
    expect(message).not.toContain("postgres");
    expect(message).not.toContain("secretpass");
    expect(message).not.toContain("10.0.0.5");
    expect(message).not.toContain("ADMIN_SECRET_KEY");

    const networkError = new Error("Failed to connect to https://internal-db.ishaara:8443");
    const netMsg = formatApiErrorMessage(networkError);
    expect(netMsg).not.toContain("internal-db");
    expect(netMsg).not.toContain("8443");
  });

  // 9. x-admin-key is only generated server-side
  it("A20-SEC-09: x-admin-key is never present in client storage or public env", () => {
    const publicEnv = Object.keys(process.env).filter((k) => k.startsWith("NEXT_PUBLIC_"));
    for (const key of publicEnv) {
      expect(key.toUpperCase()).not.toContain("ADMIN_KEY");
      expect(key.toUpperCase()).not.toContain("X_ADMIN_KEY");
      expect(key.toUpperCase()).not.toContain("ADMIN_SECRET");
    }

    const localStorageKeys = Object.keys(localStorage);
    for (const key of localStorageKeys) {
      expect(key.toLowerCase()).not.toContain("admin-key");
      expect(key.toLowerCase()).not.toContain("secret");
    }
  });

  // 10. Malformed settlement ID path traversal rejection
  it("A20-SEC-10: Settlement ID blocks path traversal and injection", async () => {
    const invalidIds = ["../admin", "set/../1", "<script>", " ", "a", "a".repeat(80)];
    for (const id of invalidIds) {
      expect(isValidSettlementId(id)).toBe(false);

      const req = new NextRequest(`http://localhost:3000/api/admin/settlements/${id}/process`, {
        method: "POST",
      });
      const res = await processHandler(req, {
        params: Promise.resolve({ settlementId: id }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_SETTLEMENT_ID");
    }
  });
});
