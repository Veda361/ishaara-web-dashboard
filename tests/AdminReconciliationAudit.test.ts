import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { settlementsApi } from "@/lib/api/settlements";
import { ReconciliationAudit } from "@/types";

describe("Phase A19 — AdminReconciliationAuditTest", () => {
  it("processes clean 7-point audit result with zero discrepancies", async () => {
    const mockCleanAudit: ReconciliationAudit = {
      checkedCount: 120,
      discrepanciesCount: 0,
      discrepancies: [],
    };

    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      success: true,
      data: mockCleanAudit,
    });

    const result = await settlementsApi.getReconciliationAudit();

    expect(result.checkedCount).toBe(120);
    expect(result.discrepanciesCount).toBe(0);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("processes discrepancy audit findings matching 7 backend financial invariants", async () => {
    const mockDiscrepancyAudit: ReconciliationAudit = {
      checkedCount: 150,
      discrepanciesCount: 3,
      discrepancies: [
        {
          settlementId: "set_discrepancy_1",
          type: "AMOUNT_MISMATCH",
          details: "Settlement amount ₹40.50 does not match gateway provider net ₹40.00",
          severity: "HIGH",
        },
        {
          settlementId: "set_discrepancy_2",
          type: "STALE_PROCESSING_LEASE",
          details: "Worker lease held > 15 minutes without status transition",
          severity: "MEDIUM",
        },
        {
          settlementId: "set_discrepancy_3",
          type: "MISSING_PROVIDER_TRANSFER_REF",
          details: "Settlement marked PROCESSED but lacks providerTransferId",
          severity: "LOW",
        },
      ],
    };

    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      success: true,
      data: mockDiscrepancyAudit,
    });

    const result = await settlementsApi.getReconciliationAudit();

    expect(result.discrepanciesCount).toBe(3);
    expect(result.discrepancies[0].type).toBe("AMOUNT_MISMATCH");
    expect(result.discrepancies[0].severity).toBe("HIGH");
    expect(result.discrepancies[1].type).toBe("STALE_PROCESSING_LEASE");
    expect(result.discrepancies[1].severity).toBe("MEDIUM");
    expect(result.discrepancies[2].severity).toBe("LOW");
  });
});
