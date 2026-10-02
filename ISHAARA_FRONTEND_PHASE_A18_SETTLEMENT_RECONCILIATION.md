# ISHAARA FRONTEND PHASE A18 — SETTLEMENT & RECONCILIATION UI

**Platform:** ISHAARA Mobility / Shared Transit Platform  
**Backend:** `https://reposnse-ishaara.onrender.com`  
**API Prefix:** `/api/v1`  
**Phase:** A18 — Settlement & Reconciliation UI  
**Previous Phase:** A17 — Agency Owner Web Dashboard  
**Next Phase:** A19 — Platform Admin Operations  
**Status:** IMPLEMENTED, TESTED & PRODUCTION VERIFIED

---

## 1. EXECUTIVE SUMMARY

Phase A18 implements the **Settlement & Reconciliation Financial Layer** within the ISHAARA Agency Owner Web Dashboard.

This phase establishes the user interface for inspecting settlement records, auditing payout statuses, viewing authoritative financial summaries, and monitoring the 7-Point Double-Entry Ledger Invariants, while maintaining strict domain separation from Phase A16 (Driver Earnings) and Phase A19 (Administrative Operations).

---

## 2. CRITICAL FINANCIAL INVARIANTS & BOUNDARIES

1. **Integer Minor Unit Precision:**
   - Financial amounts are strictly stored and transmitted as **Integer Minor Units (Paise, ₹1.00 = 100 paise)**.
   - The UI formats amounts using `formatMoneyMinor(amountMinor, currency)`.
   - Floating-point calculations and client-side arithmetic drift are eliminated.

2. **No Client-Side Derivations:**
   - The frontend NEVER calculates: `revenue = rides * fare` or `net = gross - 10%`.
   - All displayed financial quantities (Total Settled, Pending Payout, Failed Transfers) originate directly from authoritative backend records.

3. **Strict Domain Separation:**
   - **Driver Earnings != Agency Settlements:** Individual driver earnings belong to Phase A16.
   - **Agency != BusOperator:** BusOperator is a settlement entity with verified bank credentials.
   - **Administrative Shielding:** Operations requiring `x-admin-key` (payout execution, batch settlements, reconciliation sweeps) are shielded from agency owners and reserved for Phase A19.

---

## 3. SETTLEMENT STATE MACHINE

The UI implements centralized status badges and semantics derived directly from the backend `SettlementStatus` enum:

- **`NOT_READY`**: Ride completed; cooling period or payment capture pending.
- **`PENDING`**: Captured and eligible for payout dispatch.
- **`PROCESSING`**: Atomic lease acquired; transfer dispatched to Razorpay Route gateway.
- **`PROCESSED`**: Payout transfer confirmed by provider and recorded in double-entry ledger.
- **`RECONCILING`**: Discrepancy detected or provider webhook delayed; under automated review.
- **`FAILED`**: Gateway transfer rejected (invalid IFSC, frozen bank account, KYC expired).

---

## 4. 7-POINT RECONCILIATION INTEGRITY CHECKS

The Reconciliation view displays the status of the seven financial invariants enforced by the backend:
1. **Amount Invariant:** `settlement.amountMinor === payment.providerAmountMinor`
2. **Currency Uniformity:** Enforces INR currency uniformity across all transaction documents.
3. **Stale Lease Reclaimer:** Identifies worker leases hung in `PROCESSING` state for >15 minutes.
4. **Payment Reference Integrity:** Validates link to immutable payment capture records.
5. **Payout Account KYC Check:** Confirms verified banking credentials before transfer.
6. **Provider Transfer Confirmation:** Validates gateway receipt ID on processed records.
7. **Post-Settlement Refund Watch:** Detects rides refunded after payout completion.

---

## 5. USER INTERFACE & NAVIGATION

- **Sidebar Integration:** "Settlements" link added to the main navigation (`/dashboard/settlements`).
- **Settlement Overview Cards:** Total Settled, Pending Settlement, Failed Transfers, Reconciliation Status.
- **Settlement History Table:** Filterable by status (`ALL`, `PROCESSED`, `PENDING`, `FAILED`), paginated, displaying payment IDs, amounts, provider references, and timestamps.
- **Settlement Detail Inspection (`/dashboard/settlements/[settlementId]`):** Comprehensive metadata breakdown including masked payout bank account details (`****1234`).
- **Reconciliation Audit Tab:** Overview of active invariant enforcement standards.
