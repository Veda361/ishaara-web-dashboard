"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { agenciesApi } from "@/lib/api/agencies";
import { membershipsApi } from "@/lib/api/memberships";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import {
  Users,
  Bus,
  Navigation2,
  Clock,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Link2,
  AlertCircle,
  Building2,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { user, activeAgency } = useAuth();
  const agencyId = activeAgency?.id;

  const {
    data: manageData,
    isLoading: isStatsLoading,
    error: statsError,
    refetch,
  } = useQuery({
    queryKey: ["agency-manage", agencyId],
    queryFn: () => (agencyId ? agenciesApi.getAgencyManagement(agencyId) : null),
    enabled: !!agencyId,
  });

  const { data: pendingMemberships } = useQuery({
    queryKey: ["agency-pending-memberships", agencyId],
    queryFn: () =>
      agencyId
        ? membershipsApi.listMemberships(agencyId, { status: "PENDING", limit: 5 })
        : null,
    enabled: !!agencyId,
  });

  const stats = manageData?.stats;

  return (
    <div className="space-y-6">
      <TopNav
        title="Agency Overview"
        subtitle={`Realtime operational health for ${activeAgency?.name || "your agency"}`}
      />

      <div className="px-6 space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              Welcome, {user?.name || "Agency Fleet Manager"}
            </h2>
            <p className="text-xs text-slate-300">
              {activeAgency?.name} ({activeAgency?.city || "Registered Fleet"}) — Authorized Management Context
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/drivers">
              <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                <Users className="h-4 w-4 mr-1.5" />
                Manage Drivers
              </Button>
            </Link>
            <Link href="/dashboard/vehicles">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Fleet Assets
              </Button>
            </Link>
          </div>
        </div>

        {statsError && (
          <Alert variant="warning" title="Partial Operational State">
            Unable to load unified management metrics. Sub-resource lists remain fully operational.
          </Alert>
        )}

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Drivers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Drivers
              </span>
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {stats?.activeDrivers ?? stats?.totalDrivers ?? "—"}
                  </span>
                  {stats && (
                    <span className="text-xs text-slate-400">
                      of {stats.totalDrivers} total
                    </span>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">Drivers approved in your agency</p>
            </CardContent>
          </Card>

          {/* Fleet Vehicles */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Fleet Vehicles
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bus className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {stats?.activeVehicles ?? stats?.totalVehicles ?? "—"}
                  </span>
                  {stats && (
                    <span className="text-xs text-slate-400">
                      of {stats.totalVehicles} registered
                    </span>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">Registered agency fleet assets</p>
            </CardContent>
          </Card>

          {/* Active Trips */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Trips
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Navigation2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {stats?.activeTrips ?? 0}
                  </span>
                  <Badge variant="success" size="sm">
                    In Progress
                  </Badge>
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">Currently dispatched routes</p>
            </CardContent>
          </Card>

          {/* Pending Applications */}
          <Card className={pendingMemberships?.pagination.total ? "border-amber-200 bg-amber-50/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Drivers
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {pendingMemberships?.pagination.total ?? stats?.pendingMemberships ?? 0}
                  </span>
                  {(pendingMemberships?.pagination.total ?? 0) > 0 && (
                    <Badge variant="warning" size="sm">
                      Requires Action
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">Driver membership applications</p>
            </CardContent>
          </Card>
        </div>

        {/* Section: Pending Driver Review & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Review Queue (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Pending Driver Review</h3>
                {pendingMemberships && (
                  <Badge variant="neutral" size="sm">
                    {pendingMemberships.pagination.total} waiting
                  </Badge>
                )}
              </div>
              <Link
                href="/dashboard/drivers?tab=PENDING"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {(!pendingMemberships || pendingMemberships.items.length === 0) ? (
              <Card className="p-8 text-center bg-white border-dashed border-slate-200">
                <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">All driver reviews completed</p>
                <p className="text-xs text-slate-400 mt-1">
                  No driver applications are currently waiting for your review.
                </p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {pendingMemberships.items.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {mem.driver?.name || "Driver Candidate"}
                        </span>
                        <Badge variant="warning" size="sm">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {mem.driver?.email || "No email"} • {mem.driver?.yearsOfExperience || 0} yrs experience
                      </p>
                    </div>

                    <Link href={`/dashboard/drivers/${mem.id}`}>
                      <Button size="sm" variant="outline">
                        Review Application
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Operations & Agency Info (1 col) */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Fleet Operations</h3>
            <Card className="p-5 space-y-4">
              <div className="space-y-3">
                <Link href="/dashboard/assignments" className="block">
                  <div className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 border border-slate-100">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Assign Driver to Vehicle</p>
                      <p className="text-[10px] text-slate-500">Pair verified driver with fleet asset</p>
                    </div>
                  </div>
                </Link>

                <Link href="/dashboard/vehicles" className="block">
                  <div className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 border border-slate-100">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Bus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Register Fleet Vehicle</p>
                      <p className="text-[10px] text-slate-500">Add buses, minibuses, or vans</p>
                    </div>
                  </div>
                </Link>

                <Link href="/dashboard/trips" className="block">
                  <div className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-3 border border-slate-100">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <Navigation2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Fleet Dispatch</p>
                      <p className="text-[10px] text-slate-500">View and dispatch agency trips</p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Agency Boundary Invariant
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Agency membership approval authorizes operation in your fleet; platform verification is managed independently by ISHAARA KYC administration.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
