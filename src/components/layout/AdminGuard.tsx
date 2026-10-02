"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isAdmin) {
        router.replace("/unauthorized");
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 gap-3 text-slate-100">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        <p className="text-xs font-medium text-slate-400">
          Verifying administrative authorization & security clearance...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4">
        <Card className="max-w-md w-full shadow-2xl border-rose-900/40 bg-slate-900 text-slate-100">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-950/60 text-rose-400 flex items-center justify-center mb-2 border border-rose-800/40">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-rose-400 text-lg">Administrative Access Restricted</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              This terminal provides platform-level financial settlement and ledger mutation operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Authenticated User:</span>
                <span className="font-mono text-slate-300">{user?.email || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Authoritative Role:</span>
                <span className="font-mono text-amber-400">{user?.role || "UNASSIGNED"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Required Role:</span>
                <span className="font-mono text-emerald-400 font-semibold">ADMIN</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed text-center">
              Agency Owners, Drivers, and Passengers are strictly prohibited from settlement mutation consoles.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className="w-full">
                <Button variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                  Return to Agency Dashboard
                </Button>
              </Link>
              <Link href="/login" className="w-full">
                <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                  Switch to Admin Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
