# ISHAARA FRONTEND PHASE A18 — SETTLEMENT & RECONCILIATION FORENSIC AUDIT

**Date:** 2026-10-02  
**Auditor:** Senior Staff Frontend Engineer, Full-Stack Architect & Financial Systems UI Engineer  
**Platform Version:** ISHAARA Production v1.0.0  
**Phase:** A18 — Settlement & Reconciliation UI  
**Status:** FORENSIC AUDIT COMPLETED — IMPLEMENTATION AUTHORIZED WITH STRICT BOUNDARIES

---

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL DISCOVERY

In accordance with Phase A18 instructions, a forensic backend audit was performed across the authoritative API specification (`api_final_flow.md`) and the live production backend (`https://reposnse-ishaara.onrender.com`).

### Critical Architectural Findings:

1. **Entity Separation:**
   - **Driver Earnings (Phase 16):** Consumes captured payments and completed rides under `/api/v1/drivers/me/earnings`. Owned by Phase A16.
   - **Bus Operator Settlements (Phases 02, 17):** Bus Operators represent registered settlement entities with verified payout accounts (IFSC, bank account, Razorpay Route account). Located under `/api/v1/operators/:id/settlements` and `/api/v1/operators/:id/settlements/summary`.
   - **Platform Settlements & Payout Processing (Phase 17):** Global payout orchestration and batch settlements located under `/api/v1/payments/settlements/*`.
   - **Financial Reconciliation & Auditing (Phase 17):** 7-Point integrity audits and automated reconciliation sweeps located under `/api/v1/payments/settlements/reconciliation/*`.

2. **Live Backend Route Probe Results:**
   - `GET /api/v1/payments/settlements`: `HTTP 401 UNAUTHORIZED` (Route exists; requires session auth and `x-admin-key` for platform-wide settlement access).
   - `GET /api/v1/operators/:id/settlements`: `HTTP 401 UNAUTHORIZED` (Route exists; requires session auth and admin/matching operator contact).
   - `GET /api/v1/agencies/:id/settlements`: `HTTP 404 ROUTE_NOT_FOUND` (Confirmed that backend does not mount an agency-prefixed settlement route).

3. **Financial Precision Standard:**
   - Monetary values are strictly represented in **Integer Minor Units (Paise, ₹1.00 = 100 paise)**.
   - Currency standard is **INR**.
   - The frontend must never perform floating-point calculations for financial amounts or derive competing settlement sums in the browser.

---

## 2. BACKEND SETTLEMENT & RECONCILIATION ROUTE AUDIT MATRIX

| Route | Method | Auth Requirement | Authorization Level | Mutates State | Agency Owner Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/payments/settlements` | `GET` | `requireAuth` | `requireAdminKey` / Admin | No | Platform-level read (filtered by `operatorId` or `driverId`) |
| `/api/v1/payments/settlements/:settlementId` | `GET` | `requireAuth` | `requireAdminKey` / Admin | No | Detailed settlement inspection with masked bank details |
| `/api/v1/payments/settlements/:settlementId/process` | `POST` | `requireAuth` | `requireAdminKey` (Admin only) | Yes | **BLOCKED for Agency Owners** (Admin Payout Engine) |
| `/api/v1/payments/settlements/:settlementId/retry` | `POST` | `requireAuth` | `requireAdminKey` (Admin only) | Yes | **BLOCKED for Agency Owners** |
| `/api/v1/payments/settlements/batch/process` | `POST` | `requireAuth` | `requireAdminKey` (Admin only) | Yes | **BLOCKED for Agency Owners** |
| `/api/v1/operators/:id/settlements` | `GET` | `requireAuth` | Admin or matching Operator contact | No | Operator-scoped settlement history |
| `/api/v1/operators/:id/settlements/summary` | `GET` | `requireAuth` | Admin or matching Operator contact | No | Authoritative financial summary (settled, pending, failed) |
| `/api/v1/drivers/me/settlements` | `GET` | `requireAuth` | `requireDriverConductor` | No | Driver-scoped settlement history (Phase A16 boundary) |
| `/api/v1/payments/settlements/:settlementId/reconcile`| `POST` | `requireAuth` | `requireAdminKey` (Admin only) | Yes | Provider transfer state recovery |
| `/api/v1/payments/settlements/reconciliation/audit` | `GET` | `requireAuth` | `requireAdminKey` / Admin | No | 7-Point integrity discrepancy report |
| `/api/v1/payments/settlements/reconciliation/sweep` | `POST` | `requireAuth` | `requireAdminKey` (Admin only) | Yes | Background lease reclamation sweep |

---

## 3. SETTLEMENT STATE MACHINE & ENUMS

### 3.1 Settlement Statuses (`SettlementStatus`)
1. **`NOT_READY`**: Ride completed but payment capture or cooling period pending.
2. **`PENDING`**: Captured and eligible for payout dispatch.
3. **`PROCESSING`**: Atomic lease acquired, transfer dispatched to payment gateway (Razorpay Route).
4. **`PROCESSED`**: Payout transfer confirmed by provider and recorded in double-entry ledger.
5. **`RECONCILING`**: Discrepancy detected or provider webhook delayed; under automated/manual review.
6. **`FAILED`**: Gateway transfer rejected (e.g. invalid IFSC, frozen bank account, KYC expired).

### 3.2 7-Point Integrity Reconciliation Invariants
The backend scans settlements against seven strict financial invariants:
1. **Amount Mismatch:** `settlement.amountMinor !== payment.providerAmountMinor`
2. **Currency Mismatch:** `settlement.currency !== payment.currency`
3. **Stale Processing Lease:** Processing state exceeded 15 minutes without progress.
4. **Missing Payment Reference:** Settlement document missing valid `paymentId`.
5. **Unverified Operator KYC:** Payout account unverified.
6. **Missing Provider Transfer Reference:** Settled status missing provider transaction reference.
7. **Post-Settlement Refund:** Ride payment refunded after settlement was processed.

---

## 4. STRICT FINANCIAL & TENANT BOUNDARIES

1. **No Client-Side Financial Calculations:**
   - The frontend will NEVER compute: `settlement = rides * fare - fee`.
   - The frontend will NEVER invent gross, net, tax, or platform commissions.
   - All displayed financial values will be formatted from backend-provided integer minor units using `formatMoneyMinor(amountMinor, currency)`.

2. **Tenant Isolation:**
   - Dashboard users can only view financial data for the active agency or linked operator.
   - All URL parameters (e.g. `?operatorId=...`) are cross-validated against the authenticated owner context.
   - Requests returning `401` or `403` will be handled gracefully without leaking cross-tenant data.

3. **Admin Operation Shielding (A19 Preparation):**
   - Settlement mutation actions requiring `x-admin-key` (`process`, `retry`, `reconcile`, `sweep`) will NOT be exposed as executable buttons to agency owners.
   - Settlement history, status, and reconciliation reports will be presented in an authoritative, audit-ready read-only interface.

---

## 5. FRONTEND SCOPE & IMPLEMENTATION PLAN

1. **Domain Models (`src/types/settlement.ts`):** Complete TypeScript definitions for settlements, summaries, and reconciliation audits.
2. **Precision Utility (`src/lib/utils.ts`):** Centralized `formatMoneyMinor` formatter.
3. **API Service (`src/lib/api/settlements.ts`):** Reusable client layer consuming backend settlement endpoints.
4. **Settlements Page (`/dashboard/settlements`):** Financial summary cards, filterable settlement history, status badges, and reconciliation status tab.
5. **Settlement Detail Modal / View (`/dashboard/settlements/[settlementId]`):** Comprehensive metadata breakdown.
6. **Testing Suite:** Comprehensive unit and integration tests covering contract schemas, money formatting, status transitions, and tenant isolation.
