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
import { Bus, Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { BackendVehicleType } from "@/types";
import { cn } from "@/lib/utils";

const VEHICLE_TYPE_OPTIONS: { label: string; value: BackendVehicleType }[] = [
  { label: "Auto", value: "AUTO" },
  { label: "E-Rickshaw", value: "E_RICKSHAW" },
  { label: "Cab", value: "CAB" },
  { label: "Bus (Heavy Transit)", value: "BUS" },
  { label: "Car", value: "CAR" },
  { label: "Bike", value: "BIKE" },
  { label: "Other", value: "OTHER" },
];

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
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vehicleType, setVehicleType] = useState<BackendVehicleType>("BUS");
  const [capacity, setCapacity] = useState("");
  const [errors, setErrors] = useState<{
    registrationNumber?: string;
    make?: string;
    model?: string;
    vehicleType?: string;
    capacity?: string;
  }>({});

  const resetForm = () => {
    setRegistrationNumber("");
    setMake("");
    setModel("");
    setVehicleType("BUS");
    setCapacity("");
    setErrors({});
  };

  const {
    data: vehiclesResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agency-vehicles", agencyId, page],
    queryFn: () =>
      agencyId
        ? vehiclesApi.listVehicles(agencyId, {
            page,
            limit: 10,
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
      resetForm();
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
  const filteredItems = items.filter((veh) => {
    if (statusFilter === "ACTIVE") return veh.isActive === true;
    if (statusFilter === "INACTIVE") return veh.isActive === false;
    return true;
  });
  const pagination = vehiclesResult?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  const validateForm = (): boolean => {
    const errs: {
      registrationNumber?: string;
      make?: string;
      model?: string;
      vehicleType?: string;
      capacity?: string;
    } = {};

    if (!registrationNumber.trim()) {
      errs.registrationNumber = "Registration number is required";
    }

    if (!make.trim()) {
      errs.make = "Vehicle make is required";
    }

    if (!model.trim()) {
      errs.model = "Vehicle model is required";
    }

    if (!vehicleType) {
      errs.vehicleType = "Vehicle type is required";
    }

    if (capacity.trim() !== "") {
      const parsed = Number(capacity.trim());
      if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
        errs.capacity = "Seating capacity must be between 1 and 200";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: RegisterVehiclePayload = {
      registrationNumber: registrationNumber.trim().toUpperCase(),
      vehicleType,
      make: make.trim(),
      model: model.trim(),
    };

    if (capacity.trim() !== "") {
      payload.capacity = parseInt(capacity.trim(), 10);
    }

    registerMutation.mutate(payload);
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
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
            <Bus className="mx-auto h-8 w-8 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">
              {items.length === 0
                ? "No vehicles registered"
                : `No ${statusFilter.toLowerCase()} vehicles found`}
            </h4>
            <p className="text-xs text-slate-400">
              {items.length === 0
                ? "No fleet vehicles found for this agency. Click \"Add Vehicle\" to register buses or other fleet vehicles."
                : `There are currently no vehicles with ${statusFilter.toLowerCase()} status.`}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration No.</TableHead>
                    <TableHead>Make & Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Operating Status</TableHead>
                    <TableHead>Assigned Driver</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((veh) => (
                    <TableRow key={veh.id}>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        {veh.registrationNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {veh.make ? `${veh.make} ${veh.model}` : veh.model}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {veh.vehicleType || veh.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {veh.capacity ? `${veh.capacity} seats` : "—"}
                      </TableCell>
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
              {filteredItems.map((veh) => (
                <div key={veh.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-mono font-bold text-sm text-slate-900">{veh.registrationNumber}</h4>
                      <p className="text-xs text-slate-500">
                        {veh.make ? `${veh.make} ` : ""}{veh.model} • {veh.vehicleType || veh.type}
                      </p>
                    </div>
                    <Badge variant={veh.isActive ? "success" : "neutral"} size="sm">
                      {veh.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    Driver: {veh.currentAssignment?.driverName || "Unassigned"} • Capacity: {veh.capacity ? `${veh.capacity} seats` : "—"}
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
        onClose={() => {
          setIsAddOpen(false);
          resetForm();
        }}
        title="Register Fleet Vehicle"
        description="Add a new transit vehicle to your agency fleet."
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
          <Input
            id="registrationNumber"
            label="Registration Number *"
            placeholder="UP93 AA 4320"
            value={registrationNumber}
            onChange={(e) => {
              setRegistrationNumber(e.target.value);
              if (errors.registrationNumber) {
                setErrors((prev) => ({ ...prev, registrationNumber: undefined }));
              }
            }}
            error={errors.registrationNumber}
            required
          />

          <Input
            id="make"
            label="Vehicle Make *"
            placeholder="Ashok Leyland"
            helperText="Vehicle manufacturer / brand"
            value={make}
            onChange={(e) => {
              setMake(e.target.value);
              if (errors.make) {
                setErrors((prev) => ({ ...prev, make: undefined }));
              }
            }}
            error={errors.make}
            required
          />

          <Input
            id="model"
            label="Vehicle Model *"
            placeholder="Viking / Starbus / Ashoka"
            helperText="Vehicle model name"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              if (errors.model) {
                setErrors((prev) => ({ ...prev, model: undefined }));
              }
            }}
            error={errors.model}
            required
          />

          <div className="space-y-1.5">
            <label htmlFor="vehicleType" className="block text-xs font-semibold text-slate-700 tracking-wide">
              Vehicle Type *
            </label>
            <select
              id="vehicleType"
              className={cn(
                "w-full px-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs",
                errors.vehicleType && "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
              )}
              value={vehicleType}
              onChange={(e) => {
                setVehicleType(e.target.value as BackendVehicleType);
                if (errors.vehicleType) {
                  setErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }
              }}
            >
              {VEHICLE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.vehicleType && (
              <p className="text-xs text-rose-600 font-medium">{errors.vehicleType}</p>
            )}
          </div>

          <Input
            id="capacity"
            label="Seating Capacity"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 68"
            helperText="Maximum passenger seating capacity (1 - 200, optional)"
            value={capacity}
            onChange={(e) => {
              setCapacity(e.target.value);
              if (errors.capacity) {
                setErrors((prev) => ({ ...prev, capacity: undefined }));
              }
            }}
            error={errors.capacity}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
              }}
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
