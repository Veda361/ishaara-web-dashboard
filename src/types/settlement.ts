export type SettlementStatus =
  | "NOT_READY"
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "RECONCILING"
  | "FAILED";

export type ReconciliationStatus = "MATCHED" | "DISCREPANCY" | "PENDING_AUDIT";

export interface PayoutAccountMasked {
  accountHolderName?: string;
  bankAccountNumber: string;
  ifsc: string;
  razorpayAccountId?: string;
}

export interface SettlementRecord {
  id: string;
  paymentId: string;
  driverId: string;
  operatorId: string;
  amountMinor: number;
  currency: string;
  status: SettlementStatus;
  provider?: string;
  providerTransferId?: string | null;
  payoutAccountMasked?: PayoutAccountMasked;
  reconciliationStatus?: ReconciliationStatus | string;
  createdAt: string;
  updatedAt?: string;
  processedAt?: string | null;
  failedReason?: string | null;
}

export interface OperatorSettlementSummary {
  operatorId: string;
  totalSettledMinor: number;
  pendingSettledMinor: number;
  failedSettledMinor: number;
  currency: string;
  settledCount: number;
  pendingCount: number;
  failedCount: number;
}

export interface ReconciliationDiscrepancy {
  settlementId: string;
  type: string;
  details: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface ReconciliationAudit {
  checkedCount: number;
  discrepanciesCount: number;
  discrepancies: ReconciliationDiscrepancy[];
}

export interface BatchProcessResultItem {
  settlementId: string;
  status: SettlementStatus;
  error?: string | null;
}

export interface BatchProcessResponse {
  processed: number;
  succeeded: number;
  failed: number;
  results: BatchProcessResultItem[];
}

export interface ReconciliationSweepResponse {
  staleLeasesReleased?: number;
  transfersSynchronized?: number;
}

export interface RetrySettlementPayload {
  reason: string;
}
