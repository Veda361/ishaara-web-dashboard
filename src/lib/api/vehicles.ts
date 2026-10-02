import { apiClient } from "./client";
import {
  Vehicle,
  VehicleType,
  DriverVehicleAssignment,
  ApiResponse,
  PaginatedResult,
} from "@/types";

export interface RegisterVehiclePayload {
  registrationNumber: string;
  model: string;
  type: VehicleType;
  capacity: number;
}

export interface UpdateVehiclePayload {
  model?: string;
  type?: VehicleType;
  capacity?: number;
}

export const vehiclesApi = {
  async listVehicles(
    agencyId: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<PaginatedResult<Vehicle>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status && params.status !== "ALL") query.set("status", params.status);

    const qs = query.toString();
    const endpoint = `/api/v1/agencies/${encodeURIComponent(agencyId)}/vehicles${
      qs ? `?${qs}` : ""
    }`;

    const res = await apiClient.get<ApiResponse<PaginatedResult<Vehicle>>>(endpoint);
    return res.data;
  },

  async getVehicle(agencyId: string, vehicleId: string): Promise<Vehicle> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/vehicles/${encodeURIComponent(vehicleId)}`;
    const res = await apiClient.get<ApiResponse<Vehicle>>(endpoint);
    return res.data;
  },

  async registerVehicle(
    agencyId: string,
    payload: RegisterVehiclePayload
  ): Promise<Vehicle> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(agencyId)}/vehicles`;
    const res = await apiClient.post<ApiResponse<Vehicle>>(endpoint, payload);
    return res.data;
  },

  async updateVehicle(
    agencyId: string,
    vehicleId: string,
    payload: UpdateVehiclePayload
  ): Promise<Vehicle> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/vehicles/${encodeURIComponent(vehicleId)}`;
    const res = await apiClient.patch<ApiResponse<Vehicle>>(endpoint, payload);
    return res.data;
  },

  async activateVehicle(agencyId: string, vehicleId: string): Promise<Vehicle> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/vehicles/${encodeURIComponent(vehicleId)}/activate`;
    const res = await apiClient.post<ApiResponse<Vehicle>>(endpoint);
    return res.data;
  },

  async deactivateVehicle(agencyId: string, vehicleId: string): Promise<Vehicle> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/vehicles/${encodeURIComponent(vehicleId)}/deactivate`;
    const res = await apiClient.post<ApiResponse<Vehicle>>(endpoint);
    return res.data;
  },

  async assignDriver(
    agencyId: string,
    vehicleId: string,
    driverId: string
  ): Promise<DriverVehicleAssignment> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/vehicles/${encodeURIComponent(vehicleId)}/assignments`;
    const res = await apiClient.post<ApiResponse<DriverVehicleAssignment>>(endpoint, {
      driverId,
    });
    return res.data;
  },

  async unassignDriver(
    agencyId: string,
    vehicleId: string
  ): Promise<{ success: boolean; unassignedAt?: string }> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/vehicles/${encodeURIComponent(vehicleId)}/unassign`;
    const res = await apiClient.post<ApiResponse<{ unassignedAt?: string }>>(endpoint);
    return { success: true, unassignedAt: res.data?.unassignedAt };
  },

  async getVehicleAssignments(
    agencyId: string,
    vehicleId: string
  ): Promise<DriverVehicleAssignment[]> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/vehicles/${encodeURIComponent(vehicleId)}/assignments`;
    const res = await apiClient.get<ApiResponse<DriverVehicleAssignment[]>>(endpoint);
    return res.data || [];
  },
};
