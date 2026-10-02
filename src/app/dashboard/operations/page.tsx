"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { agenciesApi } from "@/lib/api/agencies";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, RefreshCw, Radio, CheckCircle2, ShieldCheck, Bus, Users, Navigation2 } from "lucide-react";

export default function OperationsPage() {
  const { activeAgency } = useAuth();
  const agencyId = activeAgency?.id;

  const {
    data: manageData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["agency-operations-metrics", agencyId],
    queryFn: () => (agencyId ? agenciesApi.getAgencyManagement(agencyId) : null),
    enabled: !!agencyId,
    refetchInterval: 30000, // 30s interval for REST poll
  });

  const stats = manageData?.stats;

  return (
    <div className="space-y-6">
      <TopNav
        title="Fleet Operations Control"
        subtitle="Authoritative operational telemetry and fleet dispatch health"
      />

      <div className="px-6 space-y-6">
        {/* Status Mode Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold tracking-tight">REST Poll Telemetry (30s Cycle)</h2>
            </div>
            <p className="text-xs text-slate-300">
              Agency owner operations are served via authoritative REST refresh. Stale data is never falsely labeled as "Live Streaming".
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="bg-white/10 hover:bg-white/20 text-white border-0 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Sync Now
          </Button>
        </div>

        {error && (
          <Alert variant="danger">
            Operational snapshot unavailable. Check connection and retry.
          </Alert>
        )}

        {/* Operational Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Drivers Online
              </span>
              <Users className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-slate-900">
                    {stats?.activeDrivers ?? 0}
                  </span>
                  <Badge variant="success" size="sm">
                    Operating
                  </Badge>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">
                Out of {stats?.totalDrivers ?? 0} total enrolled agency drivers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Fleet Vehicles
              </span>
              <Bus className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-slate-900">
                    {stats?.activeVehicles ?? 0}
                  </span>
                  <Badge variant="success" size="sm">
                    Ready
                  </Badge>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">
                Out of {stats?.totalVehicles ?? 0} registered fleet assets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Trips in Transit
              </span>
              <Navigation2 className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-slate-900">
                    {stats?.activeTrips ?? 0}
                  </span>
                  <Badge variant="info" size="sm">
                    In Transit
                  </Badge>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">Dispatched and active on campus routes</p>
            </CardContent>
          </Card>
        </div>

        {/* Operational Checklist */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Driver Operational Readiness Checklist (Phase 07)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Platform KYC Verification</span>
              </div>
              <p className="pl-6 text-[11px] text-slate-500">
                Driver license and background audit must be marked VERIFIED before vehicle assignment.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Active Vehicle Pairing</span>
              </div>
              <p className="pl-6 text-[11px] text-slate-500">
                Driver must hold a valid, non-conflicting DriverVehicleAssignment record with an active fleet asset.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Zero Suspension Lock</span>
              </div>
              <p className="pl-6 text-[11px] text-slate-500">
                Driver profile must not have administrative suspension flags triggered by safety or SOS events.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Agency Membership Approved</span>
              </div>
              <p className="pl-6 text-[11px] text-slate-500">
                Agency owner approval is confirmed on the authoritative membership ledger.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
