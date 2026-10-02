# ISHAARA FRONTEND PHASE A19 — FORENSIC BACKEND AUDIT
**Phase:** A19 — Admin Operations & Settlement Control Center  
**Environment:** Production Backend `https://reposnse-ishaara.onrender.com` / `api_final_flow.md`  
**Date:** 2026-10-02  
**Auditor:** Senior Staff Frontend & Security Systems Architect

---

## 1. Executive Summary

Phase A19 establishes the administrative control center for the ISHAARA financial settlement and reconciliation subsystem. In Phase A18, the settlement presentation layer was built for agency owners, strictly scoped to their tenant agency and shielded from high-privilege financial mutations.

In Phase A19, we perform a deep forensic audit of the backend settlement endpoints, authentication requirements, administrative authorization, state machines, and concurrency guards documented in `api_final_flow.md` (Sections 25, 26, and 27) and verified against the live backend service.

---

## 2. Admin Endpoints Discovered

The following 8 endpoints constitute the administrative settlement and reconciliation subsystem:

| Endpoint | Method | Required Auth | Required Headers | Description |
|---|---|---|---|---|
| `/api/v1/payments/settlements` | `GET` | `requireAuth` + `requireAdminKey` | `x-admin-key: <ADMIN_SECRET_KEY>`, `Authorization: Bearer <token>` | List all platform settlements with pagination and status filters |
| `/api/v1/payments/settlements/:settlementId` | `GET` | `requireAuth` + `requireAdminKey` | `x-admin-key`, `Authorization: Bearer <token>` | Retrieve single settlement details including masked payout credentials |
| `/api/v1/payments/settlements/:settlementId/process` | `POST` | `requireAuth` + `requireAdminKey` | `x-admin-key`, `Authorization: Bearer <token>` | Acquire atomic processing lease, validate operator KYC, execute Razorpay Route transfer |
| `/api/v1/payments/settlements/:settlementId/retry` | `POST` | `requireAuth` + `requireAdminKey` | `x-admin-key`, `Authorization: Bearer <token>` | Retry failed settlement. Requires `{ "reason": string }` in body |
| `/api/v1/payments/settlements/:settlementId/reconcile` | `POST` | `requireAuth` + `requireAdminKey` | `x-admin-key`, `Authorization: Bearer <token>` | Query provider transfer status, repair state to `PROCESSED` or `FAILED` |
| `/api/v1/payments/settlements/batch/process` | `POST` | `requireAuth` + `requireAdminKey` | `x-admin-key`, `Authorization: Bearer <token>` | Sweep & process all eligible `PENDING` settlements with batch concurrency protection |
| `/api/v1/payments/settlements/reconciliation/audit` | `GET` | `requireAuth` + `requireAdminKey` | `x-admin-key`, `Authorization: Bearer <token>` | Scans platform settlements and cross-checks 7 financial invariants |
| `/api/v1/payments/settlements/reconciliation/sweep` | `POST` | `requireAuth` + `requireAdminKey` | `x-admin-key`, `Authorization: Bearer <token>` | Background worker lease reclaimer releasing hung leases (>15 min) |

---

## 3. Administrative Authentication & Authorization Architecture

### 3.1 Dual-Gate Protection
All administrative settlement endpoints require two layers of security:
1. **User Authentication Session (`requireAuth`):** Validated Bearer session token. The user must be authenticated.
2. **Platform Admin Secret (`requireAdminKey`):** Validated via `x-admin-key` HTTP header matched against the backend's server-side environment secret `ADMIN_SECRET_KEY`.
3. **Rate Limiting:** Guarded by `adminRateLimiter` (100 req / 15 min window) on administrative paths.

### 3.2 Role and Tenant Boundaries
- **`USER` (Passenger/Student):** Strictly BLOCKED. Receives `HTTP 401` or `HTTP 403`.
- **`DRIVER_CONDUCTOR`:** Strictly BLOCKED from admin mutations. Can only view `/api/v1/drivers/me/settlements`.
- **`AGENCY_OWNER`:** Strictly BLOCKED from platform-wide administrative routes. Can only access `/api/v1/operators/:id/settlements` for their verified agency.
- **`ADMIN`:** Allowed access when authenticated and possessing valid administrative credentials.

---

## 4. Critical Security Analysis: `x-admin-key` Handling

### 4.1 Threat Model
`x-admin-key` is an unhashed, long-lived administrative secret granting full authority over funds transfer, batch sweeps, and ledger mutations. Exposing this key in client-side browser JavaScript, HTML, localStorage, query params, or client telemetry would represent a critical security vulnerability.

### 4.2 Architectural Solution: Server-Side Route Proxying
In Next.js App Router:
- The browser frontend NEVER touches `x-admin-key`.
- Client components invoke local internal Next.js Route Handlers located under `/api/admin/settlements/*`.
- The Next.js Route Handlers run in a Node.js server environment:
  1. Extract the client's `Authorization: Bearer <token>` header.
  2. Verify that the calling user has role `ADMIN` via the upstream `/api/v1/users/me` endpoint.
  3. Securely read `process.env.ADMIN_SECRET_KEY` (a server-only environment variable without `NEXT_PUBLIC_`).
  4. Inject `x-admin-key: process.env.ADMIN_SECRET_KEY` into the request to the upstream backend `https://reposnse-ishaara.onrender.com`.
  5. Proxy the backend response back to the client.
- If `ADMIN_SECRET_KEY` is not present in the server environment, the route handler returns `503 Service Unavailable: Administrative secret not configured on server`.
- Zero secret leakage to the browser bundle, console logs, or browser storage.

---

## 5. Settlement State Machine & Mutation Eligibility

The authoritative backend state machine consists of 6 discrete states:

```
           ┌─────────────┐
           │  NOT_READY  │ (Awaiting ride completion / dispute window)
           └──────┬──────┘
                  │
                  ▼
           ┌─────────────┐
     ┌────►│   PENDING   │ (Eligible for payout processing)
     │     └──────┬──────┘
     │            │
     │      [process / batch]
     │            │
     │            ▼
     │     ┌─────────────┐
     │     │ PROCESSING  │ (Atomic lease acquired, transfer in-flight)
     │     └──────┬──────┘
     │            │
     │      ┌─────┴────────────────┐
     │      ▼                      ▼
     │ ┌───────────┐         ┌───────────┐
     │ │ PROCESSED │         │  FAILED   │ (Provider error, KYC unverified, etc.)
     │ └─────┬─────┘         └─────┬─────┘
     │       │                     │
     │       │ [reconcile]         │ [retry with reason]
     │       ▼                     │
     │ ┌───────────┐               │
     │ │RECONCILING│               │
     │ └─────┬─────┘               │
     └───────┴─────────────────────┘
```

### Action Eligibility Rules

| Current Status | Available Operations | Prohibited Operations | Reason / Invariant |
|---|---|---|---|
| `NOT_READY` | None | Process, Retry, Reconcile | Settlement not ripe for payout (ride incomplete or dispute window active) |
| `PENDING` | **Process Settlement**, Batch Process | Retry, Reconcile | Payout has not yet been attempted; retry is invalid |
| `PROCESSING` | None (inspect lease) | Process, Retry, Reconcile | Under active lease lock; duplicate execution will trigger `HTTP 409 Conflict` |
| `PROCESSED` | **Reconcile Settlement** | Process, Retry | Payout succeeded; can only reconcile with gateway records |
| `RECONCILING` | None (inspect status) | Process, Retry, Reconcile | Provider verification in-flight; prevents concurrent repair calls |
| `FAILED` | **Retry Settlement** (with required reason) | Process, Batch Process | Prior attempt failed; retry requires explicit audit reason |

---

## 6. Audit of Administrative Mutations

### 6.1 Process Settlement (`POST /api/v1/payments/settlements/:id/process`)
- **Preconditions:** Settlement must be in `PENDING` status. Operator KYC and bank account must be verified.
- **Behavior:** Backend acquires an atomic lease, validates no refund has occurred, executes transfer via Razorpay Route, writes `SETTLEMENT` double-entry ledger records, and transitions to `PROCESSED` (or `FAILED` if transfer rejected).
- **Concurrency & Idempotency:** If another process or worker holds an active lease, backend returns `HTTP 409 Conflict: Settlement is already being processed`.

### 6.2 Retry Settlement (`POST /api/v1/payments/settlements/:id/retry`)
- **Preconditions:** Settlement must be in `FAILED` status.
- **Request Body:** Must strictly include `{ "reason": string }` (non-empty string, e.g. "Operator KYC verified by compliance").
- **Behavior:** Backend validates reason, clears failure flags, resets status to `PENDING` (or immediately re-queues processing), logs audit reason.

### 6.3 Reconcile Settlement (`POST /api/v1/payments/settlements/:id/reconcile`)
- **Preconditions:** Settlement in `PROCESSED` or `FAILED`.
- **Behavior:** Queries Razorpay Route transfer API, validates transaction ID, repairs status if out-of-sync, updates `reconciliationStatus`.

### 6.4 Batch Process (`POST /api/v1/payments/settlements/batch/process`)
- **Behavior:** Sweeps and processes all eligible `PENDING` settlements under batch concurrency lock.
- **Response Shape:**
  ```json
  {
    "processed": number,
    "succeeded": number,
    "failed": number,
    "results": [
      { "settlementId": string, "status": "PROCESSED" | "FAILED", "error": string | null }
    ]
  }
  ```

### 6.5 Automated Reconciliation Sweep (`POST /api/v1/payments/settlements/reconciliation/sweep`)
- **Behavior:** Releases hung leases (>15 minutes) and cross-syncs pending webhook records with Razorpay.

### 6.6 7-Point Integrity Audit (`GET /api/v1/payments/settlements/reconciliation/audit`)
- **Invariants Checked by Backend:**
  1. Amount mismatch: `settlement.amountMinor !== payment.providerAmountMinor`
  2. Currency mismatch: non-INR or mismatched currency code
  3. Stale processing lease: lease age > 15 minutes
  4. Missing payment reference: settlement missing linked payment ID
  5. Unverified operator KYC payout account
  6. Missing provider transfer reference on processed settlement
  7. Payment refunded post-settlement requiring manual review
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "checkedCount": number,
      "discrepanciesCount": number,
      "discrepancies": [
        {
          "settlementId": string,
          "type": string,
          "details": string,
          "severity": "HIGH" | "MEDIUM" | "LOW"
        }
      ]
    }
  }
  ```

---

## 7. Financial Invariants & Money Handling
- All financial balances and transfers are strictly formatted and stored as **integer minor units** (paise). ₹1.00 = 100 paise.
- Currency is strictly backend-authoritative (`INR`).
- Zero floating-point arithmetic allowed in frontend operations. Formatting uses the centralized `formatMoneyMinor(amountMinor, currency)` utility.
- Frontend displays backend-reported sums and counts only; it never computes net payouts, tax deductions, or platform fees client-side.

---

## 8. Backend Audit Conclusion
The backend architecture is complete, robust, and enforces atomic concurrency and financial precision. The Next.js server route proxy pattern provides a 100% secure boundary ensuring that `x-admin-key` remains exclusively server-side, protecting administrative authority while allowing authenticated administrators full operational control.
