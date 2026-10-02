"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { CreateAgencyDialog } from "@/components/agency/CreateAgencyDialog";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, ownedAgencies } = useAuth();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (user?.role === "USER" || user?.role === "DRIVER_CONDUCTOR") {
        router.replace("/unauthorized");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Verifying authoritative agency credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role === "USER" || user?.role === "DRIVER_CONDUCTOR") {
    return null;
  }

  // If user is authenticated but has no owned agency yet
  if (ownedAgencies.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full shadow-lg border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle>No Registered Agency Found</CardTitle>
            <CardDescription>
              Your account ({user?.email}) is authenticated, but no mobility agency is registered under your ownership.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              To operate the ISHAARA Agency Dashboard, register your fleet agency or contact platform support.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                id="create-agency-profile-btn"
                className="w-full gap-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Create Agency Profile
              </Button>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">Switch Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <CreateAgencyDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      </div>
    );
  }

  return <>{children}</>;
}
