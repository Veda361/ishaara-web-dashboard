import { apiClient } from "./client";
import { ApiResponse, ResolvedLocation } from "@/types";

export interface SearchLocationsParams {
  q: string;
  limit?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export const locationsApi = {
  /**
   * GET /api/v1/locations/search?q=...&limit=...
   * Resolves search query string into normalized ResolvedLocation array via backend orchestrator.
   */
  async search(query: string, limit: number = 5): Promise<ResolvedLocation[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      return [];
    }

    const params = new URLSearchParams({
      q: cleanQuery,
      limit: String(Math.min(Math.max(limit, 1), 10)),
    });

    const endpoint = `/api/v1/locations/search?${params.toString()}`;
    const res = await apiClient.get<ApiResponse<ResolvedLocation[]>>(endpoint);
    return res.data || [];
  },
};
