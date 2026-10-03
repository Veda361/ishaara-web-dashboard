import { apiClient } from "./client";
import { AgencyMembership, ApiResponse, DriverStatus, DriverVerificationStatus, PaginatedResult } from "@/types";

export interface ListMembershipsParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface RejectMembershipPayload {
  reason: string;
}

export function normalizeMembership(mem: AgencyMembership): AgencyMembership {
  if (!mem) return mem;
  const rawDriver = mem.driver;
  if (!rawDriver) return mem;

  const verificationStatus: DriverVerificationStatus =
    rawDriver.verificationStatus ||
    rawDriver.driverVerificationStatus ||
    "PENDING";

  const status: DriverStatus =
    rawDriver.status ||
    rawDriver.driverStatus ||
    "OFFLINE";

  const licenseNumber: string | undefined =
    rawDriver.licenseNumber ||
    rawDriver.licenseNumberMasked ||
    undefined;

  const id: string =
    rawDriver.id ||
    rawDriver.driverId ||
    mem.driverId;

  return {
    ...mem,
    driver: {
      ...rawDriver,
      id,
      driverId: rawDriver.driverId || id,
      status,
      driverStatus: rawDriver.driverStatus || status,
      verificationStatus,
      driverVerificationStatus: rawDriver.driverVerificationStatus || verificationStatus,
      licenseNumber,
      licenseNumberMasked: rawDriver.licenseNumberMasked || licenseNumber,
    },
  };
}

export const membershipsApi = {
  async listMemberships(
    agencyId: string,
    params?: ListMembershipsParams
  ): Promise<PaginatedResult<AgencyMembership>> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "ALL") {
      query.set("status", params.status);
    }
    if (params?.page) {
      query.set("page", String(params.page));
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }

    const qs = query.toString();
    const endpoint = `/api/v1/agencies/${encodeURIComponent(agencyId)}/memberships${
      qs ? `?${qs}` : ""
    }`;

    const res = await apiClient.get<ApiResponse<PaginatedResult<AgencyMembership>>>(endpoint);
    const data = res.data;
    return {
      ...data,
      items: (data?.items || []).map(normalizeMembership),
    };
  },

  async getMembership(
    agencyId: string,
    membershipId: string
  ): Promise<AgencyMembership> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/memberships/${encodeURIComponent(membershipId)}`;
    const res = await apiClient.get<ApiResponse<AgencyMembership>>(endpoint);
    return normalizeMembership(res.data);
  },

  async approveMembership(
    agencyId: string,
    membershipId: string
  ): Promise<AgencyMembership> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/memberships/${encodeURIComponent(membershipId)}/approve`;
    const res = await apiClient.post<ApiResponse<AgencyMembership>>(endpoint);
    return normalizeMembership(res.data);
  },

  async rejectMembership(
    agencyId: string,
    membershipId: string,
    payload: RejectMembershipPayload
  ): Promise<AgencyMembership> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/memberships/${encodeURIComponent(membershipId)}/reject`;
    const res = await apiClient.post<ApiResponse<AgencyMembership>>(endpoint, {
      reason: payload.reason,
    });
    return normalizeMembership(res.data);
  },
};
