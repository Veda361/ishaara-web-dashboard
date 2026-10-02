import { apiClient } from "./client";
import { AgencyMembership, ApiResponse, PaginatedResult } from "@/types";

export interface ListMembershipsParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface ApproveMembershipPayload {
  notes?: string;
}

export interface RejectMembershipPayload {
  reason: string;
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
    return res.data;
  },

  async getMembership(
    agencyId: string,
    membershipId: string
  ): Promise<AgencyMembership> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/memberships/${encodeURIComponent(membershipId)}`;
    const res = await apiClient.get<ApiResponse<AgencyMembership>>(endpoint);
    return res.data;
  },

  async approveMembership(
    agencyId: string,
    membershipId: string,
    payload?: ApproveMembershipPayload
  ): Promise<AgencyMembership> {
    const endpoint = `/api/v1/agencies/${encodeURIComponent(
      agencyId
    )}/memberships/${encodeURIComponent(membershipId)}/approve`;
    const res = await apiClient.post<ApiResponse<AgencyMembership>>(
      endpoint,
      payload?.notes ? { notes: payload.notes } : {}
    );
    return res.data;
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
    return res.data;
  },
};
