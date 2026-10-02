import { apiClient } from "./client";
import { Trip, TripStatus, LocationPoint, ApiResponse, PaginatedResult } from "@/types";

export interface DispatchTripPayload {
  origin: LocationPoint;
  destination: LocationPoint;
  scheduledStartTime: string;
  vehicleId: string;
  driverId: string;
}

export const tripsApi = {
  async listTrips(
    agencyId: string,
    params?: { page?: number; limit?: number; status?: TripStatus | string }
  ): Promise<PaginatedResult<Trip>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status && params.status !== "ALL") query.set("status", params.status);

    const qs = query.toString();
    const endpoint = `/api/v1/agencies/${encodeURIComponent(agencyId)}/trips${
      qs ? `?${qs}` : ""
    }`;

    const res = await apiClient.get<ApiResponse<PaginatedResult<Trip>>>(endpoint);
    return res.data;
  },

  async getTrip(agencyId: string, tripId: string): Promise<Trip> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/trips/${encodeURIComponent(tripId)}`;
    const res = await apiClient.get<ApiResponse<Trip>>(endpoint);
    return res.data;
  },

  async dispatchTrip(agencyId: string, payload: DispatchTripPayload): Promise<Trip> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(agencyId)}/trips`;
    const res = await apiClient.post<ApiResponse<Trip>>(endpoint, payload);
    return res.data;
  },

  async cancelTrip(agencyId: string, tripId: string, reason: string): Promise<Trip> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/trips/${encodeURIComponent(tripId)}/cancel`;
    const res = await apiClient.post<ApiResponse<Trip>>(endpoint, { reason });
    return res.data;
  },
};
