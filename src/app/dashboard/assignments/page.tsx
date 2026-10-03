"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { vehiclesApi } from "@/lib/api/vehicles";
import { membershipsApi } from "@/lib/api/memberships";
import { TopNav } from "@/components/layout/TopNav";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import {
  Link2,
  Plus,
  UserX,
  Info,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function AssignmentsPage() {
  const { activeAgency } = useAuth();
  const agencyId = activeAgency?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");

  // Load vehicles
  const { data: vehiclesResult, isLoading: isVehiclesLoading } = useQuery({
    queryKey: ["agency-vehicles-for-assign", agencyId],
    queryFn: () => (agencyId ? vehiclesApi.listVehicles(agencyId, { limit: 50 }) : null),
    enabled: !!agencyId,
  });

  // Load approved drivers
  const { data: driversResult, isLoading: isDriversLoading } = useQuery({
    queryKey: ["agency-approved-drivers-for-assign", agencyId],
    queryFn: () =>
      agencyId ? membershipsApi.listMemberships(agencyId, { status: "APPROVED", limit: 50 }) : null,
    enabled: !!agencyId,
  });

  const vehicles = vehiclesResult?.items || [];
  const approvedMemberships = driversResult?.items || [];

  // Active assignments extracted from vehicles
  const assignedVehicles = vehicles.filter((v) => !!v.currentAssignment);

  // Distinguish verified drivers (eligible) vs unverified drivers (ineligible)
  const verifiedMemberships = approvedMemberships.filter(
    (m) => m.driver?.verificationStatus === "VERIFIED"
  );
  const unverifiedMemberships = approvedMemberships.filter(
    (m) => m.driver?.verificationStatus !== "VERIFIED"
  );

  const selectedDriverMembership = approvedMemberships.find(
    (m) => (m.driverId || m.id) === selectedDriverId
  );
  const isSelectedDriverVerified =
    selectedDriverMembership?.driver?.verificationStatus === "VERIFIED";

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const isSelectedVehicleAssigned = !!selectedVehicle?.currentAssignment;

  const assignMutation = useMutation({
    mutationFn: () =>
      vehiclesApi.assignDriver(agencyId!, selectedVehicleId, selectedDriverId),
    onSuccess: () => {
      toast("Driver assigned to vehicle successfully", "success");
      setIsAssignOpen(false);
      setSelectedVehicleId("");
      setSelectedDriverId("");
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles-for-assign", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-manage", agencyId] });
    },
    onError: (err) => {
      toast(formatApiErrorMessage(err), "error");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (vehicleId: string) => vehiclesApi.unassignDriver(agencyId!, vehicleId),
    onSuccess: () => {
      toast("Driver unassigned from vehicle", "info");
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles-for-assign", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-manage", agencyId] });
    },
    onError: (err) => {
      toast(formatApiErrorMessage(err), "error");
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedDriverId) return;

    // Phase 5 defensive frontend validation: verify platform verification status === VERIFIED
    if (!isSelectedDriverVerified) {
      toast("Driver must be platform VERIFIED before vehicle assignment.", "error");
      return;
    }

    assignMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <TopNav
        title="Driver-Vehicle Assignments"
        subtitle="Manage authoritative pairing between agency fleet assets and approved drivers"
      />

      <div className="px-6 space-y-6">
        {/* Domain Notice Banner */}
        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 space-y-1">
            <span className="font-semibold block">Authoritative Assignment Rule:</span>
            <p>
              DriverVehicleAssignment is the authoritative driver ↔ vehicle relationship. A driver must be approved in your agency, have platform KYC completed, and cannot be simultaneously assigned to multiple active vehicles.
            </p>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Active Fleet Pairings</h3>
          <Button size="sm" onClick={() => setIsAssignOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Assign Driver
          </Button>
        </div>

        {/* Table View */}
        {isVehiclesLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : assignedVehicles.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
            <Link2 className="mx-auto h-8 w-8 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">No active assignments</h4>
            <p className="text-xs text-slate-400">
              No vehicles currently have active driver assignments. Click "Assign Driver" to create a pairing.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type & Model</TableHead>
                  <TableHead>Assigned Driver</TableHead>
                  <TableHead>Assigned At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedVehicles.map((veh) => {
                  const asg = veh.currentAssignment;
                  return (
                    <TableRow key={veh.id}>
                      <TableCell className="font-mono font-bold text-slate-900">
                        {veh.registrationNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {veh.model} ({veh.type})
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-slate-900">
                            {asg?.driverName || asg?.driverId || "Assigned Driver"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {asg?.assignedAt ? formatDateTime(asg.assignedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" size="sm">
                          ACTIVE
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => unassignMutation.mutate(veh.id)}
                          disabled={unassignMutation.isPending}
                        >
                          <UserX className="h-3.5 w-3.5 mr-1" />
                          Unassign
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Assign Driver Dialog */}
      <Dialog
        isOpen={isAssignOpen}
        onClose={() => {
          setIsAssignOpen(false);
          setSelectedVehicleId("");
          setSelectedDriverId("");
        }}
        title="Assign Driver to Vehicle"
        description="Select an available fleet vehicle and an eligible, platform-verified agency driver."
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {/* Phase 4: Handle empty verified driver list */}
          {approvedMemberships.length > 0 && verifiedMemberships.length === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>No verified drivers available</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Drivers must complete platform verification before they can be assigned to a vehicle.
              </p>
              <div className="pt-1">
                <Link
                  href="/dashboard/drivers"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-950 underline hover:text-black"
                >
                  Manage fleet drivers & verification status
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {approvedMemberships.length === 0 && !isDriversLoading && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-semibold block text-slate-800">No approved drivers found</span>
              <p>Your agency has no approved drivers in its fleet yet. You must review and approve driver applications before assigning them to vehicles.</p>
              <div className="pt-1">
                <Link
                  href="/dashboard/drivers"
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Go to Driver Applications
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Select Vehicle *</label>
            <select
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              required
            >
              <option value="">— Choose a fleet vehicle —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} ({v.model} - {v.capacity} seats) {v.currentAssignment ? "• [Currently Assigned]" : ""}
                </option>
              ))}
            </select>
            {isSelectedVehicleAssigned && (
              <p className="text-[11px] text-amber-600">
                Notice: This vehicle already has an active driver assignment. Reassignment will terminate the previous pairing.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Select Verified Driver *</label>
              <span className="text-[11px] text-slate-400 font-medium">
                {verifiedMemberships.length} verified available
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Only platform-verified drivers can be assigned to vehicles.
            </p>
            <select
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200"
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              required
            >
              <option value="">— Choose an eligible verified driver —</option>
              {verifiedMemberships.length > 0 && (
                <optgroup label="Platform Verified Drivers (Eligible)">
                  {verifiedMemberships.map((m) => (
                    <option key={m.driverId || m.id} value={m.driverId || m.id}>
                      {m.driver?.name || "Driver"} ({m.driver?.email || m.driverId})
                    </option>
                  ))}
                </optgroup>
              )}
              {unverifiedMemberships.length > 0 && (
                <optgroup label="Pending / Unverified Drivers (Ineligible)">
                  {unverifiedMemberships.map((m) => {
                    const statusText = m.driver?.verificationStatus || "PENDING";
                    return (
                      <option
                        key={m.driverId || m.id}
                        value={m.driverId || m.id}
                        disabled
                        className="text-slate-400 bg-slate-50"
                      >
                        {m.driver?.name || "Driver"} ({m.driver?.email || m.driverId}) — Platform verification {statusText.toLowerCase()}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>

          {/* Phase 9: Driver verification link if an unverified driver is chosen */}
          {selectedDriverMembership && !isSelectedDriverVerified && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start justify-between gap-3">
              <div>
                <span className="font-semibold block">Driver Verification Required:</span>
                <p>
                  {selectedDriverMembership.driver?.name || "This driver"} has platform verification status:{" "}
                  <strong>{selectedDriverMembership.driver?.verificationStatus || "PENDING"}</strong>. Drivers must be platform VERIFIED before vehicle assignment.
                </p>
              </div>
              <Link
                href={`/dashboard/drivers/${selectedDriverMembership.id}`}
                target="_blank"
                className="shrink-0 inline-flex items-center gap-1 font-semibold text-rose-950 underline hover:text-rose-800"
              >
                View Driver Verification
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Verification confirmation when verified driver is selected */}
          {selectedDriverMembership && isSelectedDriverVerified && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Driver <strong>{selectedDriverMembership.driver?.name}</strong> is platform VERIFIED and eligible for vehicle assignment.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAssignOpen(false);
                setSelectedVehicleId("");
                setSelectedDriverId("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={assignMutation.isPending}
              disabled={
                !selectedVehicleId ||
                !selectedDriverId ||
                !isSelectedDriverVerified ||
                assignMutation.isPending
              }
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
