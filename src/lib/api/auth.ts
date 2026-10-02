import { apiClient } from "./client";
import { User, AuthSession, ApiResponse } from "@/types";

export interface SendOtpPayload {
  email: string;
  type?: "sign-in" | "email-verification" | "forget-password" | "change-email";
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface SignInResponse {
  user: User;
  token: string;
}

export const authApi = {
  async sendOtp(payload: SendOtpPayload): Promise<{ success: boolean; message?: string }> {
    return apiClient.post<{ success: boolean; message?: string }>(
      "/api/auth/email-otp/send-verification-otp",
      { email: payload.email.trim().toLowerCase(), type: payload.type || "sign-in" },
      { skipAuth: true }
    );
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<SignInResponse> {
    return apiClient.post<SignInResponse>(
      "/api/auth/sign-in/email-otp",
      { email: payload.email.trim().toLowerCase(), otp: payload.otp.trim() },
      { skipAuth: true }
    );
  },

  async getSession(): Promise<AuthSession> {
    return apiClient.get<AuthSession>("/api/auth/get-session");
  },

  async signOut(): Promise<{ success: boolean }> {
    try {
      return await apiClient.post<{ success: boolean }>("/api/auth/sign-out");
    } catch {
      return { success: true };
    }
  },

  async getCurrentUser(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User>>("/api/v1/users/me");
    return res.data;
  },
};
