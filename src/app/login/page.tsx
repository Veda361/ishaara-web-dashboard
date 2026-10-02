"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { formatApiErrorMessage } from "@/lib/errors";
import { KeyRound, Mail, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithToken, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [step, setStep] = useState<"EMAIL" | "OTP" | "TOKEN">("EMAIL");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter a valid agency owner email.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authApi.sendOtp({ email: cleanEmail, type: "sign-in" });
      setSuccessMessage(`One-time verification code sent to ${cleanEmail}`);
      setStep("OTP");
    } catch (err) {
      setError(formatApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await authApi.verifyOtp({ email: cleanEmail, otp: cleanOtp });
      await loginWithToken(res.token, res.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(formatApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken.trim()) {
      setError("Please enter a valid session Bearer token.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { authStorage } = await import("@/lib/api/client");
      authStorage.setToken(sessionToken.trim());
      const currentUser = await authApi.getCurrentUser();
      await loginWithToken(sessionToken.trim(), currentUser);
      router.replace("/dashboard");
    } catch (err) {
      setError(formatApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F9FC] p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Banner */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/25">
            IS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ISHAARA Agency Portal</h1>
          <p className="text-xs text-slate-500">Authoritative Shared Mobility & Fleet Management</p>
        </div>

        {/* Auth Card */}
        <Card className="border-slate-200 shadow-xl bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Agency Owner Sign In</CardTitle>
            <CardDescription>
              {step === "EMAIL" && "Enter your registered email to receive an authentication code."}
              {step === "OTP" && `Enter the 6-digit code sent to ${email}`}
              {step === "TOKEN" && "Enter an active session Bearer token for direct authentication."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="danger">
                {error}
              </Alert>
            )}

            {successMessage && (
              <Alert variant="success">
                {successMessage}
              </Alert>
            )}

            {step === "EMAIL" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <Input
                  label="Agency Owner Email"
                  type="email"
                  placeholder="owner@agency.isahara.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" isLoading={isLoading} className="w-full">
                  <span>Send Login Code</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </form>
            )}

            {step === "OTP" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  label="6-Digit Verification Code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep("EMAIL");
                      setOtp("");
                    }}
                    className="flex-1"
                  >
                    Change Email
                  </Button>
                  <Button type="submit" isLoading={isLoading} className="flex-1">
                    <span>Verify & Enter</span>
                    <ShieldCheck className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isLoading}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Resend Code
                  </button>
                </div>
              </form>
            )}

            {step === "TOKEN" && (
              <form onSubmit={handleDirectTokenLogin} className="space-y-4">
                <Input
                  label="Session Bearer Token"
                  type="password"
                  placeholder="sess_..."
                  value={sessionToken}
                  onChange={(e) => setSessionToken(e.target.value)}
                  required
                  autoFocus
                />
                <Button type="submit" isLoading={isLoading} className="w-full">
                  <span>Authenticate with Token</span>
                  <KeyRound className="h-4 w-4 ml-1" />
                </Button>
              </form>
            )}

            {/* Toggle Direct Token Input (ideal for fast test automation & staging credentials) */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              {step !== "TOKEN" ? (
                <button
                  type="button"
                  onClick={() => setStep("TOKEN")}
                  className="text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Use Session Token
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep("EMAIL")}
                  className="text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Use Email OTP
                </button>
              )}
              <span className="text-[10px] text-slate-400">Better Auth Protected</span>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-slate-400 leading-relaxed">
          Authorized personnel only. All access and actions within the ISHAARA Agency Dashboard are logged and verified against authoritative backend policies.
        </div>
      </div>
    </div>
  );
}
