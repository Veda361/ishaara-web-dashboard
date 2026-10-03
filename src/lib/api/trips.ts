import { apiClient } from "./client";
import { Trip, TripStatus, TripLocationInput, ApiResponse, PaginatedResult } from "@/types";

export interface DispatchTripPayload {
  driverId: string;
  vehicleId: string;
  origin: TripLocationInput;
  destination: TripLocationInput;
  scheduledDepartureAt?: string;
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

    const res = await apiClient.get<ApiResponse<PaginatedResult<Trip> | Trip[]>>(endpoint);
    if (Array.isArray(res.data)) {
      const page = params?.page || 1;
      const limit = params?.limit || 20;
      return {
        items: res.data,
        pagination: {
          total: res.data.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(res.data.length / limit)),
        },
      };
    }
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

    // Strictly format location payloads to exclude any unpermitted fields
    const sanitizedPayload: DispatchTripPayload = {
      driverId: payload.driverId,
      vehicleId: payload.vehicleId,
      origin: {
        ...(payload.origin.name ? { name: payload.origin.name } : {}),
        formattedAddress: payload.origin.formattedAddress,
        latitude: payload.origin.latitude,
        longitude: payload.origin.longitude,
        ...(payload.origin.googlePlaceId ? { googlePlaceId: payload.origin.googlePlaceId } : {}),
        ...(payload.origin.serpApiDataId ? { serpApiDataId: payload.origin.serpApiDataId } : {}),
      },
      destination: {
        ...(payload.destination.name ? { name: payload.destination.name } : {}),
        formattedAddress: payload.destination.formattedAddress,
        latitude: payload.destination.latitude,
        longitude: payload.destination.longitude,
        ...(payload.destination.googlePlaceId ? { googlePlaceId: payload.destination.googlePlaceId } : {}),
        ...(payload.destination.serpApiDataId ? { serpApiDataId: payload.destination.serpApiDataId } : {}),
      },
      ...(payload.scheduledDepartureAt ? { scheduledDepartureAt: payload.scheduledDepartureAt } : {}),
    };

    console.debug("[AgencyTrip] final payload", JSON.stringify(sanitizedPayload, null, 2));

    const res = await apiClient.post<ApiResponse<Trip>>(endpoint, sanitizedPayload);
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
