import { apiClient } from "./client";
import {
  SettlementRecord,
  OperatorSettlementSummary,
  ReconciliationAudit,
  ApiResponse,
  PaginatedResult,
} from "@/types";

export interface ListSettlementsParams {
  page?: number;
  limit?: number;
  status?: string;
  operatorId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
}

export const settlementsApi = {
  /**
   * List settlements for a specific transit operator
   */
  async listOperatorSettlements(
    operatorId: string,
    params?: ListSettlementsParams
  ): Promise<PaginatedResult<SettlementRecord>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status && params.status !== "ALL") query.set("status", params.status);

    const qs = query.toString();
    const endpoint = `/api/v1/operators/${encodeURIComponent(operatorId)}/settlements${
      qs ? `?${qs}` : ""
    }`;

    const res = await apiClient.get<ApiResponse<PaginatedResult<SettlementRecord>>>(endpoint);
    return res.data;
  },

  /**
   * Get operator settlement summary metrics
   */
  async getOperatorSettlementSummary(operatorId: string): Promise<OperatorSettlementSummary> {
    const endpoint = `/api/v1/operators/${encodeURIComponent(operatorId)}/settlements/summary`;
    const res = await apiClient.get<ApiResponse<OperatorSettlementSummary>>(endpoint);
    return res.data;
  },

  /**
   * List platform settlements (admin / privileged audit access)
   * Proxied through server-side /api/admin/settlements for secure x-admin-key injection
   */
  async listPlatformSettlements(
    params?: ListSettlementsParams
  ): Promise<PaginatedResult<SettlementRecord>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.operatorId) query.set("operatorId", params.operatorId);
    if (params?.driverId) query.set("driverId", params.driverId);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);

    const qs = query.toString();
    const endpoint = `/api/admin/settlements${qs ? `?${qs}` : ""}`;

    const res = await apiClient.get<ApiResponse<PaginatedResult<SettlementRecord>>>(endpoint);
    return res.data;
  },

  /**
   * Get single settlement detail by ID (admin proxied)
   */
  async getSettlementDetail(settlementId: string): Promise<SettlementRecord> {
    const endpoint = `/api/admin/settlements/${encodeURIComponent(settlementId)}`;
    const res = await apiClient.get<ApiResponse<SettlementRecord>>(endpoint);
    return res.data;
  },

  /**
   * Process single settlement (executes payout via Razorpay Route)
   */
  async processSettlement(settlementId: string): Promise<SettlementRecord> {
    const endpoint = `/api/admin/settlements/${encodeURIComponent(settlementId)}/process`;
    const res = await apiClient.post<ApiResponse<SettlementRecord>>(endpoint, {});
    return res.data;
  },

  /**
   * Retry failed settlement with mandatory audit reason
   */
  async retrySettlement(settlementId: string, reason: string): Promise<SettlementRecord> {
    const endpoint = `/api/admin/settlements/${encodeURIComponent(settlementId)}/retry`;
    const res = await apiClient.post<ApiResponse<SettlementRecord>>(endpoint, { reason });
    return res.data;
  },

  /**
   * Reconcile single settlement with payment provider
   */
  async reconcileSettlement(settlementId: string): Promise<SettlementRecord> {
    const endpoint = `/api/admin/settlements/${encodeURIComponent(settlementId)}/reconcile`;
    const res = await apiClient.post<ApiResponse<SettlementRecord>>(endpoint, {});
    return res.data;
  },

  /**
   * Batch process all pending settlements
   */
  async processBatchSettlements(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    results: Array<{ settlementId: string; status: string; error?: string | null }>;
  }> {
    const endpoint = `/api/admin/settlements/batch/process`;
    const res = await apiClient.post<
      ApiResponse<{
        processed: number;
        succeeded: number;
        failed: number;
        results: Array<{ settlementId: string; status: string; error?: string | null }>;
      }>
    >(endpoint, {});
    return res.data;
  },

  /**
   * Inspect 7-point reconciliation audit integrity status
   */
  async getReconciliationAudit(): Promise<ReconciliationAudit> {
    const endpoint = `/api/admin/settlements/reconciliation/audit`;
    const res = await apiClient.get<ApiResponse<ReconciliationAudit>>(endpoint);
    return res.data;
  },

  /**
   * Run automated reconciliation sweep
   */
  async sweepReconciliation(): Promise<{
    staleLeasesReleased?: number;
    transfersSynchronized?: number;
  }> {
    const endpoint = `/api/admin/settlements/reconciliation/sweep`;
    const res = await apiClient.post<
      ApiResponse<{
        staleLeasesReleased?: number;
        transfersSynchronized?: number;
      }>
    >(endpoint, {});
    return res.data;
  },
};

