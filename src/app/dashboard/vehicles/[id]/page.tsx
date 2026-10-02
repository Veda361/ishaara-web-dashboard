"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { vehiclesApi } from "@/lib/api/vehicles";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { formatApiErrorMessage } from "@/lib/errors";
import { ArrowLeft, Bus, UserCheck, History, UserX } from "lucide-react";

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = typeof params.id === "string" ? params.id : "";
  const { activeAgency } = useAuth();
  const agencyId = activeAgency?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: vehicle,
    isLoading: isVehicleLoading,
    error: vehicleError,
  } = useQuery({
    queryKey: ["agency-vehicle", agencyId, vehicleId],
    queryFn: () => (agencyId && vehicleId ? vehiclesApi.getVehicle(agencyId, vehicleId) : null),
    enabled: !!agencyId && !!vehicleId,
  });

  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
  } = useQuery({
    queryKey: ["vehicle-assignments", agencyId, vehicleId],
    queryFn: () =>
      agencyId && vehicleId ? vehiclesApi.getVehicleAssignments(agencyId, vehicleId) : [],
    enabled: !!agencyId && !!vehicleId,
  });

  const unassignMutation = useMutation({
    mutationFn: () => vehiclesApi.unassignDriver(agencyId!, vehicleId),
    onSuccess: () => {
      toast("Driver unassigned from vehicle", "info");
      queryClient.invalidateQueries({ queryKey: ["agency-vehicle", agencyId, vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-assignments", agencyId, vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles", agencyId] });
    },
    onError: (err) => toast(formatApiErrorMessage(err), "error"),
  });

  return (
    <div className="space-y-6">
      <TopNav
        title="Vehicle Fleet Details"
        subtitle={`Audit and assignment history for ${vehicle?.registrationNumber || vehicleId}`}
      />

      <div className="px-6 space-y-6 max-w-4xl">
        <Link
          href="/dashboard/vehicles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vehicles
        </Link>

        {vehicleError && (
          <Alert variant="danger">
            {formatApiErrorMessage(vehicleError)}
          </Alert>
        )}

        {isVehicleLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        ) : !vehicle ? (
          <Card className="p-8 text-center">
            <Bus className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Vehicle record not found</p>
          </Card>
        ) : (
          <>
            {/* Vehicle Profile Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-mono font-bold text-sm">
                    {vehicle.type.slice(0, 3)}
                  </div>
                  <div>
                    <CardTitle className="font-mono text-lg">{vehicle.registrationNumber}</CardTitle>
                    <p className="text-xs text-slate-500">{vehicle.model}</p>
                  </div>
                </div>

                <Badge variant={vehicle.isActive ? "success" : "neutral"}>
                  {vehicle.isActive ? "ACTIVE FLEET" : "INACTIVE"}
                </Badge>
              </CardHeader>

              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Vehicle Type
                  </span>
                  <span className="text-sm font-medium text-slate-900">{vehicle.type}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Seating Capacity
                  </span>
                  <span className="text-sm font-medium text-slate-900">{vehicle.capacity} seats</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Ownership Type
                  </span>
                  <span className="text-sm font-medium text-slate-900">{vehicle.ownershipType}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Registered On
                  </span>
                  <span className="text-slate-800">{formatDateTime(vehicle.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Driver Assignment Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-sm">Current Driver Assignment</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {vehicle.currentAssignment ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-slate-900">
                        {vehicle.currentAssignment.driverName || "Assigned Agency Driver"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Assigned on: {formatDateTime(vehicle.currentAssignment.assignedAt)}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => unassignMutation.mutate()}
                      disabled={unassignMutation.isPending}
                    >
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Unassign Driver
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No driver is currently assigned to this vehicle.
                    <div className="mt-2">
                      <Link href="/dashboard/assignments">
                        <Button size="sm" variant="outline">
                          Go to Driver Assignments
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-600" />
                  <CardTitle className="text-sm">Assignment History</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {assignments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No historical assignments recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((asg) => (
                      <div
                        key={asg.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            Driver ID: {asg.driverId}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            {formatDateTime(asg.assignedAt)} — {asg.unassignedAt ? formatDateTime(asg.unassignedAt) : "Present"}
                          </p>
                        </div>
                        <Badge variant={asg.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                          {asg.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
