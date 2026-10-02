import { describe, it, expect } from "vitest";
import { isValidSettlementId } from "@/lib/server/adminProxy";
import { NextRequest } from "next/server";
import { POST as retryHandler } from "@/app/api/admin/settlements/[settlementId]/retry/route";
import { POST as processHandler } from "@/app/api/admin/settlements/[settlementId]/process/route";

describe("Phase A20 — InputValidationSecurityTest", () => {
  describe("A20-015: Settlement ID validation", () => {
    it("accepts valid settlement IDs", () => {
      expect(isValidSettlementId("set_6abc1234567890")).toBe(true);
      expect(isValidSettlementId("6abbc83dbe0dcde3d9cb889f")).toBe(true);
      expect(isValidSettlementId("set_test-123_abc")).toBe(true);
    });

    it("rejects malformed settlement IDs, path traversal, and special characters", () => {
      expect(isValidSettlementId("")).toBe(false);
      expect(isValidSettlementId("  ")).toBe(false);
      expect(isValidSettlementId("../admin/secret")).toBe(false);
      expect(isValidSettlementId("set/../123")).toBe(false);
      expect(isValidSettlementId("<script>alert(1)</script>")).toBe(false);
      expect(isValidSettlementId("set 123")).toBe(false);
      expect(isValidSettlementId("a")).toBe(false); // too short
      expect(isValidSettlementId("a".repeat(70))).toBe(false); // too long
    });

    it("process handler rejects malformed settlement ID with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements/../bad/process", {
        method: "POST",
      });

      const res = await processHandler(req, {
        params: Promise.resolve({ settlementId: "../bad" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_SETTLEMENT_ID");
    });
  });

  describe("A20-016 & A20-017: Retry reason validation", () => {
    it("rejects empty object payload with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_123/retry", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await retryHandler(req, {
        params: Promise.resolve({ settlementId: "set_123" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("MISSING_RETRY_REASON");
    });

    it("rejects empty reason string with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_123/retry", {
        method: "POST",
        body: JSON.stringify({ reason: "" }),
      });

      const res = await retryHandler(req, {
        params: Promise.resolve({ settlementId: "set_123" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_REASON_LENGTH");
    });

    it("rejects whitespace-only reason string with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_123/retry", {
        method: "POST",
        body: JSON.stringify({ reason: "    " }),
      });

      const res = await retryHandler(req, {
        params: Promise.resolve({ settlementId: "set_123" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_REASON_LENGTH");
    });

    it("rejects reason with length less than 3 characters with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_123/retry", {
        method: "POST",
        body: JSON.stringify({ reason: "ab" }),
      });

      const res = await retryHandler(req, {
        params: Promise.resolve({ settlementId: "set_123" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_REASON_LENGTH");
    });

    it("rejects null or non-string reason with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/settlements/set_123/retry", {
        method: "POST",
        body: JSON.stringify({ reason: null }),
      });

      const res = await retryHandler(req, {
        params: Promise.resolve({ settlementId: "set_123" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("MISSING_RETRY_REASON");
    });
  });
});
