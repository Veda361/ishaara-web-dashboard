# ISHAARA FRONTEND PHASE A18 — CHANGELOG

## [1.1.0] - Phase A18 Release - 2026-10-02

### Added
- **Financial Types & Domain Models:**
  - Defined `SettlementRecord`, `SettlementStatus`, `OperatorSettlementSummary`, `ReconciliationAudit`, and `PayoutAccountMasked` in `src/types/settlement.ts`.
- **Financial Precision Standard:**
  - Implemented `formatMoneyMinor(amountMinor, currency)` in `src/lib/utils.ts` for integer minor units (paise), preventing floating-point precision drift.
- **Settlement API Service:**
  - Created `src/lib/api/settlements.ts` with `listOperatorSettlements`, `getOperatorSettlementSummary`, `listPlatformSettlements`, `getSettlementDetail`, and `getReconciliationAudit`.
- **Settlement & Reconciliation Pages:**
  - `/dashboard/settlements`: Overview summary cards (Total Settled, Pending Settlement, Failed Transfers), Settlement History table with pagination and status filters, and 7-Point Reconciliation Audit inspection tab.
  - `/dashboard/settlements/[settlementId]`: Settlement detail inspection view displaying authoritative amounts, timestamps, payment reference, and masked bank account information.
- **Navigation Integration:**
  - Added "Settlements" item to `Sidebar.tsx` navigation.
- **Testing Suite:**
  - `tests/SettlementMoneyPrecision.test.ts`: 13 test cases verifying 0, 1, 10, 99, 100, 101, 1000, 4050, large integers, negative amounts, and NaN/null boundaries.
  - `tests/SettlementStrictContract.test.ts`: Validates settlement schema, status enums, and summary contracts.
  - `tests/SettlementTenantIsolation.test.ts`: Verifies cross-tenant isolation and 403 Forbidden handling.
  - `tests/SettlementAuthorization.test.ts`: Confirms passenger (`USER`) and driver (`DRIVER_CONDUCTOR`) blocking and admin-shielding boundaries.
- **Documentation:**
  - `ISHAARA_FRONTEND_PHASE_A18_FORENSIC_AUDIT.md`
  - `ISHAARA_FRONTEND_PHASE_A18_API_CONTRACT.md`
  - `ISHAARA_FRONTEND_PHASE_A18_SETTLEMENT_RECONCILIATION.md`
  - `ISHAARA_PHASE_18_MANUAL_TEST_PLAN.md`
