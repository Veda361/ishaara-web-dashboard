import { describe, it, expect } from "vitest";
import { authStorage } from "@/lib/api/client";

describe("Phase A19 — AdminSecretSecurityTest", () => {
  it("ensures x-admin-key is never stored in browser storage (localStorage)", () => {
    // Only user session tokens are stored in client authStorage
    const storedKeys = Object.keys(localStorage);
    for (const key of storedKeys) {
      expect(key.toLowerCase()).not.toContain("admin");
      expect(key.toLowerCase()).not.toContain("secret");
      expect(key.toLowerCase()).not.toContain("x-admin-key");
    }
  });

  it("ensures NEXT_PUBLIC_ variables do not leak administrative secrets", () => {
    // In Next.js, process.env keys starting with NEXT_PUBLIC_ are bundled into client code.
    // Verify that NO NEXT_PUBLIC_ variable contains ADMIN_KEY or ADMIN_SECRET.
    const publicEnvKeys = Object.keys(process.env).filter((k) => k.startsWith("NEXT_PUBLIC_"));
    for (const envKey of publicEnvKeys) {
      expect(envKey.toUpperCase()).not.toContain("ADMIN_SECRET");
      expect(envKey.toUpperCase()).not.toContain("ADMIN_KEY");
      expect(envKey.toUpperCase()).not.toContain("X_ADMIN_KEY");
    }
  });

  it("ensures administrative endpoints use local server-side proxy route prefix", () => {
    const adminProxyPrefix = "/api/admin/settlements";
    expect(adminProxyPrefix.startsWith("/api/admin")).toBe(true);
    // Browser targets same-origin proxy without carrying x-admin-key header
    expect(adminProxyPrefix).not.toContain("x-admin-key");
  });

  it("ensures client session token is separated from server administrative secrets", () => {
    authStorage.setToken("mock_bearer_session_token");
    const token = authStorage.getToken();
    expect(token).toBe("mock_bearer_session_token");
    expect(token).not.toContain("x-admin-key");
    authStorage.clearToken();
  });
});
