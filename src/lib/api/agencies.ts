import { apiClient } from "./client";
import { Agency, AgencyManageData, ApiResponse, PaginatedResult } from "@/types";

export interface RegisterAgencyPayload {
  name: string;
  contactEmail: string;
  contactPhone: string;
  city?: string;
  businessName?: string;
}

export interface UpdateAgencyPayload {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  businessName?: string;
}

export const agenciesApi = {
  async getMyOwnedAgencies(): Promise<Agency[]> {
    const res = await apiClient.get<ApiResponse<Agency[]>>("/api/v1/agencies/me/owned");
    return res.data || [];
  },

  async getAgencyManagement(agencyId: string): Promise<AgencyManageData> {
    const res = await apiClient.get<ApiResponse<AgencyManageData>>(
      `/api/v1/agencies/${encodeURIComponent(agencyId)}/manage`
    );
    return res.data;
  },

  async getAgencyById(agencyId: string): Promise<Agency> {
    const res = await apiClient.get<ApiResponse<Agency>>(
      `/api/v1/agencies/${encodeURIComponent(agencyId)}`
    );
    return res.data;
  },

  async registerAgency(payload: RegisterAgencyPayload): Promise<Agency> {
    const res = await apiClient.post<ApiResponse<Agency>>("/api/v1/agencies", payload);
    return res.data;
  },

  async updateAgency(agencyId: string, payload: UpdateAgencyPayload): Promise<Agency> {
    const res = await apiClient.patch<ApiResponse<Agency>>(
      `/api/v1/agencies/${encodeURIComponent(agencyId)}`,
      payload
    );
    return res.data;
  },

  async listPublicAgencies(params?: { search?: string; city?: string; page?: number; limit?: number }): Promise<PaginatedResult<Agency>> {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.city) query.set("city", params.city);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const res = await apiClient.get<ApiResponse<PaginatedResult<Agency>>>(
      `/api/v1/agencies${qs ? `?${qs}` : ""}`,
      { skipAuth: true }
    );
    return res.data;
  },
};
