"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldX, Smartphone, LogOut } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
      <Card className="max-w-md w-full shadow-xl border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <ShieldX className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Access Restricted</CardTitle>
          <CardDescription>
            The ISHAARA Web Dashboard is strictly reserved for verified Agency Owners.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
            <p>
              Current User: <span className="font-semibold text-slate-800">{user?.email || "Unknown"}</span>
            </p>
            <p>
              Assigned Role: <span className="font-semibold text-rose-700">{user?.role || "USER"}</span>
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/60 text-xs">
            <Smartphone className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Drivers and Passengers should access their profiles and services through the ISHAARA Android mobile app.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out & Switch Account
            </Button>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
