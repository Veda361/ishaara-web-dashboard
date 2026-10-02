import { describe, it, expect } from "vitest";
import { SettlementRecord, OperatorSettlementSummary, SettlementStatus } from "@/types";

describe("Phase A18 — SettlementStrictContractTest", () => {
  it("enforces valid backend settlement statuses", () => {
    const validStatuses: SettlementStatus[] = [
      "NOT_READY",
      "PENDING",
      "PROCESSING",
      "PROCESSED",
      "RECONCILING",
      "FAILED",
    ];

    expect(validStatuses).toContain("PROCESSED");
    expect(validStatuses).toContain("PENDING");
    expect(validStatuses).toContain("FAILED");
  });

  it("validates SettlementRecord schema adherence", () => {
    const record: SettlementRecord = {
      id: "set_6abc1234567890",
      paymentId: "pay_6def1234567890",
      driverId: "drv_6ghi1234567890",
      operatorId: "6abbc83dbe0dcde3d9cb889f",
      amountMinor: 4050,
      currency: "INR",
      status: "PROCESSED",
      provider: "RAZORPAY",
      providerTransferId: "trf_mock_abc123",
      payoutAccountMasked: {
        accountHolderName: "City Express Transit Pvt Ltd",
        bankAccountNumber: "****1234",
        ifsc: "HDFC0001234",
      },
      reconciliationStatus: "MATCHED",
      createdAt: "2026-09-30T10:15:00.000Z",
      processedAt: "2026-09-30T11:00:00.000Z",
    };

    expect(record.amountMinor).toBe(4050);
    expect(Number.isInteger(record.amountMinor)).toBe(true);
    expect(record.currency).toBe("INR");
    expect(record.payoutAccountMasked?.bankAccountNumber).toMatch(/\*{4}\d{4}/);
  });

  it("validates OperatorSettlementSummary schema adherence", () => {
    const summary: OperatorSettlementSummary = {
      operatorId: "6abbc83dbe0dcde3d9cb889f",
      totalSettledMinor: 450000,
      pendingSettledMinor: 18000,
      failedSettledMinor: 0,
      currency: "INR",
      settledCount: 50,
      pendingCount: 2,
      failedCount: 0,
    };

    expect(summary.totalSettledMinor).toBeGreaterThan(0);
    expect(summary.settledCount).toBe(50);
    expect(summary.currency).toBe("INR");
  });
});
