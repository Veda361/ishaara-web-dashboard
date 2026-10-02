import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { settlementsApi } from "@/lib/api/settlements";
import { ApiError } from "@/lib/errors";

describe("Phase A19 — AdminConcurrentMutationTest", () => {
  it("safely handles 409 Conflict when concurrent administrator has leased the settlement", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(
      new ApiError(409, "LEASE_CONFLICT", "Settlement is already being processed under active lease")
    );

    await expect(settlementsApi.processSettlement("set_conflict_1")).rejects.toThrowError(
      /Settlement is already being processed/
    );
  });

  it("handles 422 Unprocessable Entity when operator banking KYC is incomplete", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(
      new ApiError(422, "OPERATOR_KYC_UNVERIFIED", "Operator payout account requires compliance verification")
    );

    await expect(settlementsApi.processSettlement("set_kyc_missing")).rejects.toThrowError(
      /Operator payout account requires compliance verification/
    );
  });

  it("handles 429 Rate Limited when administrative rate limiter window is exceeded", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(
      new ApiError(429, "RATE_LIMITED", "Too many administrative requests. Please wait.")
    );

    await expect(settlementsApi.processBatchSettlements()).rejects.toThrowError(
      /Too many administrative requests/
    );
  });

  it("handles 503 Service Unavailable when server admin secret key is not configured", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(
      new ApiError(
        503,
        "ADMIN_KEY_NOT_CONFIGURED",
        "Server-side ADMIN_SECRET_KEY is not configured in environment. Admin operations are blocked."
      )
    );

    await expect(settlementsApi.processSettlement("set_no_key")).rejects.toThrowError(
      /ADMIN_SECRET_KEY is not configured/
    );
  });
});
