"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { vehiclesApi, RegisterVehiclePayload } from "@/lib/api/vehicles";
import { TopNav } from "@/components/layout/TopNav";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage } from "@/lib/errors";
import { Bus, Plus, Eye, ToggleLeft, ToggleRight, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { VehicleType } from "@/types";

export default function VehiclesPage() {
  const { activeAgency } = useAuth();
  const agencyId = activeAgency?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [model, setModel] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("BUS");
  const [capacity, setCapacity] = useState(32);

  const {
    data: vehiclesResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agency-vehicles", agencyId, statusFilter, page],
    queryFn: () =>
      agencyId
        ? vehiclesApi.listVehicles(agencyId, {
            page,
            limit: 10,
            status: statusFilter === "ALL" ? undefined : statusFilter,
          })
        : null,
    enabled: !!agencyId,
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterVehiclePayload) =>
      vehiclesApi.registerVehicle(agencyId!, payload),
    onSuccess: () => {
      toast("Vehicle registered to agency fleet", "success");
      setIsAddOpen(false);
      setRegistrationNumber("");
      setModel("");
      setCapacity(32);
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-manage", agencyId] });
    },
    onError: (err) => {
      toast(formatApiErrorMessage(err), "error");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (vehicleId: string) => vehiclesApi.activateVehicle(agencyId!, vehicleId),
    onSuccess: () => {
      toast("Vehicle activated for operations", "success");
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles", agencyId] });
    },
    onError: (err) => toast(formatApiErrorMessage(err), "error"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (vehicleId: string) => vehiclesApi.deactivateVehicle(agencyId!, vehicleId),
    onSuccess: () => {
      toast("Vehicle deactivated from active dispatch", "info");
      queryClient.invalidateQueries({ queryKey: ["agency-vehicles", agencyId] });
    },
    onError: (err) => toast(formatApiErrorMessage(err), "error"),
  });

  const items = vehiclesResult?.items || [];
  const pagination = vehiclesResult?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim() || !model.trim()) return;
    registerMutation.mutate({
      registrationNumber: registrationNumber.trim().toUpperCase(),
      model: model.trim(),
      type: vehicleType,
      capacity: Number(capacity),
    });
  };

  return (
    <div className="space-y-6">
      <TopNav
        title="Fleet Vehicles"
        subtitle={`Registered vehicles for ${activeAgency?.name || "your agency"}`}
      />

      <div className="px-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {["ALL", "ACTIVE", "INACTIVE"].map((st) => (
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

          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Vehicle
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
            <Bus className="mx-auto h-8 w-8 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">No vehicles registered</h4>
            <p className="text-xs text-slate-400">
              No fleet vehicles found for this agency. Click "Add Vehicle" to register buses or vans.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration No.</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Operating Status</TableHead>
                    <TableHead>Assigned Driver</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((veh) => (
                    <TableRow key={veh.id}>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        {veh.registrationNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{veh.model}</TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {veh.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{veh.capacity} seats</TableCell>
                      <TableCell>
                        <Badge variant={veh.isActive ? "success" : "neutral"} size="sm">
                          {veh.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {veh.currentAssignment?.driverName ? (
                          <span className="font-medium text-slate-800">
                            {veh.currentAssignment.driverName}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {veh.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deactivateMutation.mutate(veh.id)}
                            disabled={deactivateMutation.isPending}
                            className="text-xs text-slate-500 hover:text-amber-700"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => activateMutation.mutate(veh.id)}
                            disabled={activateMutation.isPending}
                            className="text-xs text-slate-500 hover:text-emerald-700"
                          >
                            Activate
                          </Button>
                        )}
                        <Link href={`/dashboard/vehicles/${veh.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
              {items.map((veh) => (
                <div key={veh.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-mono font-bold text-sm text-slate-900">{veh.registrationNumber}</h4>
                      <p className="text-xs text-slate-500">{veh.model} • {veh.type}</p>
                    </div>
                    <Badge variant={veh.isActive ? "success" : "neutral"} size="sm">
                      {veh.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    Driver: {veh.currentAssignment?.driverName || "Unassigned"} • Capacity: {veh.capacity}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Link href={`/dashboard/vehicles/${veh.id}`} className="w-full">
                      <Button size="sm" variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

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
          </>
        )}
      </div>

      {/* Add Vehicle Modal */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Fleet Vehicle"
        description="Add a new transit vehicle to your agency fleet."
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <Input
            label="Registration Number *"
            placeholder="MH12AB1234"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            required
          />
          <Input
            label="Vehicle Model *"
            placeholder="Tata Starbus Ultra"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Vehicle Type</label>
            <select
              className="w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
            >
              <option value="BUS">Bus (Heavy Transit)</option>
              <option value="MINIBUS">Minibus (Shuttle)</option>
              <option value="VAN">Van / Traveler</option>
              <option value="AUTO">Auto</option>
            </select>
          </div>
          <Input
            label="Seating Capacity *"
            type="number"
            min={1}
            max={100}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={registerMutation.isPending}>
              Register Vehicle
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
