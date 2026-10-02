import { describe, it, expect, vi, beforeEach } from "vitest";
import { settlementsApi } from "@/lib/api/settlements";
import { apiClient } from "@/lib/api/client";

describe("Phase A19 — AdminSettlementMutationTest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("executes single settlement process mutation with correct endpoint", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      success: true,
      data: {
        id: "set_101",
        status: "PROCESSED",
        providerTransferId: "trf_razorpay_99812",
        processedAt: "2026-10-02T12:00:00Z",
      },
    });

    const result = await settlementsApi.processSettlement("set_101");

    expect(postSpy).toHaveBeenCalledWith("/api/admin/settlements/set_101/process", {});
    expect(result.status).toBe("PROCESSED");
    expect(result.providerTransferId).toBe("trf_razorpay_99812");
  });

  it("executes settlement retry mutation with required non-empty audit reason", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      success: true,
      data: {
        id: "set_102",
        status: "PENDING",
        failedReason: null,
      },
    });

    const reason = "Operator IFSC code corrected and verified by compliance";
    const result = await settlementsApi.retrySettlement("set_102", reason);

    expect(postSpy).toHaveBeenCalledWith("/api/admin/settlements/set_102/retry", { reason });
    expect(result.status).toBe("PENDING");
  });

  it("executes settlement reconciliation mutation with gateway provider", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      success: true,
      data: {
        id: "set_103",
        status: "PROCESSED",
        reconciliationStatus: "MATCHED",
        providerTransferId: "trf_gateway_5544",
      },
    });

    const result = await settlementsApi.reconcileSettlement("set_103");

    expect(postSpy).toHaveBeenCalledWith("/api/admin/settlements/set_103/reconcile", {});
    expect(result.status).toBe("PROCESSED");
    expect(result.reconciliationStatus).toBe("MATCHED");
  });

  it("executes batch settlements process mutation and returns aggregated counts", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      success: true,
      data: {
        processed: 8,
        succeeded: 7,
        failed: 1,
        results: [
          { settlementId: "set_1", status: "PROCESSED", error: null },
          { settlementId: "set_2", status: "FAILED", error: "BANK_TIMEOUT" },
        ],
      },
    });

    const result = await settlementsApi.processBatchSettlements();

    expect(postSpy).toHaveBeenCalledWith("/api/admin/settlements/batch/process", {});
    expect(result.processed).toBe(8);
    expect(result.succeeded).toBe(7);
    expect(result.failed).toBe(1);
    expect(result.results.length).toBe(2);
  });

  it("executes automated reconciliation sweep mutation and returns lease release counts", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      success: true,
      data: {
        staleLeasesReleased: 3,
        transfersSynchronized: 12,
      },
    });

    const result = await settlementsApi.sweepReconciliation();

    expect(postSpy).toHaveBeenCalledWith("/api/admin/settlements/reconciliation/sweep", {});
    expect(result.staleLeasesReleased).toBe(3);
    expect(result.transfersSynchronized).toBe(12);
  });
});
