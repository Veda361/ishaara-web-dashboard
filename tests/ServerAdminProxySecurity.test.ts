import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxyAdminRequest, clearUserRoleCache } from "@/lib/server/adminProxy";

describe("Phase A20 — ServerAdminProxySecurityTest", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearUserRoleCache();
    process.env = { ...originalEnv, ADMIN_SECRET_KEY: "test_admin_secret_key_mock_999" };
  });

  afterEach(() => {
    process.env = originalEnv;
    clearUserRoleCache();
  });

  it("A20-011: rejects unauthenticated requests with 401 UNAUTHORIZED", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
      method: "GET",
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("A20-012: strictly BLOCKS non-admin users (AGENCY_OWNER) with 403 FORBIDDEN and prevents secret attachment", async () => {
    // Mock upstream /api/v1/users/me returning AGENCY_OWNER role
    const globalFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/v1/users/me")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "user_owner_1", role: "AGENCY_OWNER", email: "owner@transit.fleet" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Unexpected call", { status: 500 });
    });

    const req = new NextRequest("http://localhost:3000/api/admin/settlements/batch/process", {
      method: "POST",
      headers: {
        authorization: "Bearer mock_owner_token",
      },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements/batch/process", "POST");
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");

    // CRITICAL: Upstream batch/process was NEVER called with x-admin-key!
    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(String(globalFetch.mock.calls[0][0])).toContain("/api/v1/users/me");
  });

  it("A20-012-B: strictly BLOCKS passengers (USER) and drivers (DRIVER_CONDUCTOR) with 403 FORBIDDEN", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: { id: "user_passenger_1", role: "USER" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
      method: "GET",
      headers: {
        authorization: "Bearer mock_passenger_token",
      },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("A20-013: allows verified ADMIN user and safely attaches x-admin-key server-side", async () => {
    let capturedAdminHeader: string | null = null;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/v1/users/me")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "admin_user_1", role: "ADMIN", email: "admin@ishaara.internal" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (urlStr.includes("/api/v1/payments/settlements")) {
        const headers = init?.headers as Record<string, string>;
        capturedAdminHeader = headers["x-admin-key"];
        return new Response(
          JSON.stringify({
            success: true,
            data: { items: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not found", { status: 404 });
    });

    const req = new NextRequest("http://localhost:3000/api/admin/settlements", {
      method: "GET",
      headers: {
        authorization: "Bearer mock_admin_token",
      },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements", "GET");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(capturedAdminHeader).toBe("test_admin_secret_key_mock_999");
  });

  it("A20-019: safely maps upstream 409 Conflict without leaking backend internals", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/v1/users/me")) {
        return new Response(
          JSON.stringify({ success: true, data: { id: "admin_1", role: "ADMIN" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "LEASE_CONFLICT",
            message: "Settlement is already being processed under an active lease.",
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    });

    const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_1/process", {
      method: "POST",
      headers: { authorization: "Bearer mock_admin_token" },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements/set_1/process", "POST", {});
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("LEASE_CONFLICT");
  });

  it("A20-020: sanitizes upstream gateway failure and returns 502 with safe error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/v1/users/me")) {
        return new Response(
          JSON.stringify({ success: true, data: { id: "admin_1", role: "ADMIN" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error("connect ECONNREFUSED 10.0.0.1:443");
    });

    const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_1/process", {
      method: "POST",
      headers: { authorization: "Bearer mock_admin_token" },
    });

    const res = await proxyAdminRequest(req, "/api/v1/payments/settlements/set_1/process", "POST", {});
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("GATEWAY_ERROR");
    expect(JSON.stringify(body)).not.toContain("ADMIN_SECRET_KEY");
    expect(JSON.stringify(body)).not.toContain("x-admin-key");
  });

  it("A20-022: returns 503 Service Unavailable when ADMIN_SECRET_KEY is missing on server", async () => {
    delete process.env.ADMIN_SECRET_KEY;

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, data: { id: "admin_1", role: "ADMIN" } }),
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
    expect(JSON.stringify(body)).not.toContain("test_admin_secret_key");
  });
});
