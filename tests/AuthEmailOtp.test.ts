import { describe, it, expect, vi, beforeEach } from "vitest";
import { authApi } from "@/lib/api/auth";
import { apiClient } from "@/lib/api/client";

describe("Phase A24.1 — Auth Email OTP Delivery & Verification Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("authApi.sendOtp", () => {
    it("normalizes recipient email and attaches required type 'sign-in'", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({ success: true });

      const response = await authApi.sendOtp({
        email: "  Test.Owner@Agency.Isahara.App  ",
      });

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith(
        "/api/auth/email-otp/send-verification-otp",
        {
          email: "test.owner@agency.isahara.app",
          type: "sign-in",
        },
        { skipAuth: true }
      );
      expect(response.success).toBe(true);
    });

    it("respects custom type when explicitly provided", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({ success: true });

      await authApi.sendOtp({
        email: "user@example.com",
        type: "forget-password",
      });

      expect(postSpy).toHaveBeenCalledWith(
        "/api/auth/email-otp/send-verification-otp",
        {
          email: "user@example.com",
          type: "forget-password",
        },
        { skipAuth: true }
      );
    });
  });

  describe("authApi.verifyOtp", () => {
    it("normalizes email and trims OTP before submitting to verification endpoint", async () => {
      const mockSignInResponse = {
        user: {
          id: "usr_123",
          email: "test.owner@agency.isahara.app",
          role: "AGENCY_OWNER" as const,
          name: "Agency Owner",
          createdAt: "2026-01-01T00:00:00Z",
        },
        token: "sess_valid_token_xyz",
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockSignInResponse);

      const result = await authApi.verifyOtp({
        email: "  Test.Owner@Agency.Isahara.App  ",
        otp: " 123456 ",
      });

      expect(postSpy).toHaveBeenCalledWith(
        "/api/auth/sign-in/email-otp",
        {
          email: "test.owner@agency.isahara.app",
          otp: "123456",
        },
        { skipAuth: true }
      );
      expect(result.token).toBe("sess_valid_token_xyz");
      expect(result.user.role).toBe("AGENCY_OWNER");
    });
  });
});
