"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { tripsApi, DispatchTripPayload } from "@/lib/api/trips";
import { vehiclesApi } from "@/lib/api/vehicles";
import { membershipsApi } from "@/lib/api/memberships";
import { TopNav } from "@/components/layout/TopNav";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { formatApiErrorMessage } from "@/lib/errors";
import { Navigation2, Plus, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { TripStatus, TripLocationInput } from "@/types";
import { LocationPicker } from "@/components/trips/LocationPicker";

export default function TripsPage() {
  const { activeAgency } = useAuth();
  const agencyId = activeAgency?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  // Dispatch Form
  const [originLocation, setOriginLocation] = useState<TripLocationInput | null>(null);
  const [destLocation, setDestLocation] = useState<TripLocationInput | null>(null);
  const [originError, setOriginError] = useState<string | null>(null);
  const [destError, setDestError] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [startTime, setStartTime] = useState("");

  const {
    data: tripsResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agency-trips", agencyId, statusFilter, page],
    queryFn: () =>
      agencyId
        ? tripsApi.listTrips(agencyId, {
            page,
            limit: 10,
            status: statusFilter === "ALL" ? undefined : statusFilter,
          })
        : null,
    enabled: !!agencyId,
  });

  const { data: vehiclesResult } = useQuery({
    queryKey: ["agency-vehicles-for-trip", agencyId],
    queryFn: () => (agencyId ? vehiclesApi.listVehicles(agencyId, { limit: 50 }) : null),
    enabled: isDispatchOpen && !!agencyId,
  });

  const { data: driversResult } = useQuery({
    queryKey: ["agency-drivers-for-trip", agencyId],
    queryFn: () =>
      agencyId ? membershipsApi.listMemberships(agencyId, { status: "APPROVED", limit: 50 }) : null,
    enabled: isDispatchOpen && !!agencyId,
  });

  const dispatchMutation = useMutation({
    mutationFn: (payload: DispatchTripPayload) =>
      tripsApi.dispatchTrip(agencyId!, payload),
    onSuccess: () => {
      toast("Fleet trip dispatched successfully", "success");
      setIsDispatchOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agency-trips", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-manage", agencyId] });
    },
    onError: (err) => toast(formatApiErrorMessage(err), "error"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => tripsApi.cancelTrip(agencyId!, selectedTripId, cancelReason),
    onSuccess: () => {
      toast("Trip cancelled", "info");
      setIsCancelOpen(false);
      setSelectedTripId("");
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["agency-trips", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-manage", agencyId] });
    },
    onError: (err) => toast(formatApiErrorMessage(err), "error"),
  });

  const items = tripsResult?.items || [];
  const pagination = tripsResult?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const getTripBadge = (status: TripStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">IN PROGRESS</Badge>;
      case "CREATED":
        return <Badge variant="info">SCHEDULED</Badge>;
      case "COMPLETED":
        return <Badge variant="neutral">COMPLETED</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const handleOpenDispatch = () => {
    setOriginLocation(null);
    setDestLocation(null);
    setOriginError(null);
    setDestError(null);
    setVehicleId("");
    setDriverId("");
    setStartTime("");
    setIsDispatchOpen(true);
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;

    if (
      !originLocation ||
      typeof originLocation.latitude !== "number" ||
      typeof originLocation.longitude !== "number" ||
      !originLocation.formattedAddress
    ) {
      setOriginError("Please select a valid origin location from the search results.");
      hasError = true;
    } else {
      setOriginError(null);
    }

    if (
      !destLocation ||
      typeof destLocation.latitude !== "number" ||
      typeof destLocation.longitude !== "number" ||
      !destLocation.formattedAddress
    ) {
      setDestError("Please select a valid destination location from the search results.");
      hasError = true;
    } else {
      setDestError(null);
    }

    if (!vehicleId) {
      toast("Please select a vehicle.", "error");
      hasError = true;
    }

    if (!driverId) {
      toast("Please select a driver.", "error");
      hasError = true;
    }

    if (hasError) return;

    const payload: DispatchTripPayload = {
      driverId,
      vehicleId,
      origin: {
        ...(originLocation!.name ? { name: originLocation!.name } : {}),
        formattedAddress: originLocation!.formattedAddress,
        latitude: originLocation!.latitude,
        longitude: originLocation!.longitude,
        ...(originLocation!.googlePlaceId ? { googlePlaceId: originLocation!.googlePlaceId } : {}),
        ...(originLocation!.serpApiDataId ? { serpApiDataId: originLocation!.serpApiDataId } : {}),
      },
      destination: {
        ...(destLocation!.name ? { name: destLocation!.name } : {}),
        formattedAddress: destLocation!.formattedAddress,
        latitude: destLocation!.latitude,
        longitude: destLocation!.longitude,
        ...(destLocation!.googlePlaceId ? { googlePlaceId: destLocation!.googlePlaceId } : {}),
        ...(destLocation!.serpApiDataId ? { serpApiDataId: destLocation!.serpApiDataId } : {}),
      },
      ...(startTime ? { scheduledDepartureAt: new Date(startTime).toISOString() } : {}),
    };

    console.debug("[AgencyTrip] final payload", JSON.stringify(payload, null, 2));

    dispatchMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <TopNav
        title="Fleet Trips"
        subtitle={`Agency dispatched trips for ${activeAgency?.name || "your agency"}`}
      />

      <div className="px-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {["ALL", "ACTIVE", "CREATED", "COMPLETED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={handleOpenDispatch} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Dispatch Trip
          </Button>
        </div>

        {error && (
          <Alert variant="danger">
            {formatApiErrorMessage(error)}
          </Alert>
        )}

        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : items.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
            <Navigation2 className="mx-auto h-8 w-8 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">No operational trips found</h4>
            <p className="text-xs text-slate-400">
              No trips recorded matching current status. Click "Dispatch Trip" to schedule an agency route.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip Origin & Destination</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Scheduled Start</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">
                          {trip.origin?.name || trip.origin?.formattedAddress || "Origin"} →{" "}
                          {trip.destination?.name || trip.destination?.formattedAddress || "Destination"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {trip.id.slice(0, 12)}...</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {trip.vehicle?.registrationNumber || trip.vehicleId}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {trip.driver?.name || trip.driverId}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateTime(trip.scheduledDepartureAt || trip.scheduledStartTime || trip.createdAt || "")}
                    </TableCell>
                    <TableCell>{getTripBadge(trip.status)}</TableCell>
                    <TableCell className="text-right">
                      {trip.status !== "COMPLETED" && trip.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTripId(trip.id);
                            setIsCancelOpen(true);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Trip Dialog */}
      <Dialog
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        title="Agency Fleet Dispatch"
        description="Schedule a new agency transit route."
      >
        <form onSubmit={handleDispatchSubmit} noValidate className="space-y-4">
          <LocationPicker
            label="Origin Landmark / Location *"
            placeholder="Search origin landmark (e.g. Jhansi)..."
            value={originLocation}
            onChange={(loc) => {
              setOriginLocation(loc);
              if (loc) setOriginError(null);
            }}
            error={originError || undefined}
            variant="origin"
            id="dispatch-origin-picker"
          />

          <LocationPicker
            label="Destination Landmark / Location *"
            placeholder="Search destination landmark (e.g. Datia)..."
            value={destLocation}
            onChange={(loc) => {
              setDestLocation(loc);
              if (loc) setDestError(null);
            }}
            error={destError || undefined}
            variant="destination"
            id="dispatch-dest-picker"
          />

          <div className="space-y-1.5">
            <label htmlFor="dispatch-vehicle-select" className="text-xs font-semibold text-slate-700">Select Vehicle *</label>
            <select
              id="dispatch-vehicle-select"
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              required
            >
              <option value="">— Select fleet vehicle —</option>
              {vehiclesResult?.items.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} ({v.model || v.make || "Vehicle"})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dispatch-driver-select" className="text-xs font-semibold text-slate-700">Select Driver *</label>
            <select
              id="dispatch-driver-select"
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
            >
              <option value="">— Select approved driver —</option>
              {driversResult?.items.map((m) => {
                const targetDriverId = m.driver?.id || m.driver?.driverId || m.driverId;
                return (
                  <option key={m.id} value={targetDriverId}>
                    {m.driver?.name || "Driver"} ({m.driver?.email || "No email"})
                  </option>
                );
              })}
            </select>
          </div>
          <Input
            id="dispatch-start-time"
            label="Scheduled Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDispatchOpen(false)}
            >
              Cancel
            </Button>
            <Button id="dispatch-submit-button" type="submit" size="sm" isLoading={dispatchMutation.isPending}>
              Dispatch Trip
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Cancel Trip Dialog */}
      <Dialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Agency Trip"
        description="State reason for cancelling this trip."
      >
        <div className="space-y-4">
          <Input
            label="Cancellation Reason *"
            placeholder="e.g. Mechanical maintenance or route obstruction"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={cancelMutation.isPending}
              disabled={!cancelReason.trim()}
              onClick={() => cancelMutation.mutate()}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
