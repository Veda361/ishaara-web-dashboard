# ISHAARA FRONTEND PHASE A19 — ADMIN OPERATIONS ARCHITECTURE
**Phase:** A19 — Admin Operations & Settlement Control Center  
**Base URL:** `https://reposnse-ishaara.onrender.com`  
**Internal Proxy Base:** `/api/admin/settlements/*`  
**Date:** 2026-10-02  
**Author:** Senior Staff Frontend & Security Architect

---

## 1. Architectural Overview

Phase A19 delivers the production administrative control center for financial settlement lifecycle mutations, batch sweeps, and 7-point reconciliation auditing. 

While Phase A18 provided a strictly scoped, tenant-isolated view of settlements for agency fleet operators, Phase A19 provides platform-wide financial governance strictly reserved for authenticated administrators.

### Core Architectural Principles
1. **Backend Authority:** All settlement states, transition outcomes, and reconciliation findings originate strictly from the backend service. No client-side state prediction.
2. **Zero Client Secret Leakage:** The privileged platform secret `x-admin-key` NEVER touches client-side JavaScript, HTML, localStorage, or browser network payloads. All administrative requests are proxied server-side via Next.js Route Handlers.
3. **Strict Authorization Barrier:** Access is guarded both client-side via `AdminGuard` and server-side by checking the caller's session token and role before attaching the administrative secret.
4. **Financial Integer Precision:** Amounts remain strictly integer minor units (`paise` in INR) with zero floating-point arithmetic.
5. **Atomic Concurrency Protection:** High-impact mutations handle database lease locks and return structured feedback for `409 Conflict`, `422 Unprocessable`, and `429 Rate Limit`.

---

## 2. Server-Side Administrative Proxy Architecture

```
┌─────────────────────────────────┐
│ Browser Client (Admin Console)  │
└────────────────┬────────────────┘
                 │ Authorization: Bearer <session_token>
                 │ [ZERO x-admin-key leakage]
                 ▼
┌────────────────────────────────────────────────────────┐
│ Next.js Node.js Server Route Handlers                   │
│ (/api/admin/settlements/*)                              │
│                                                        │
│ 1. Verify user session via Bearer token                │
│ 2. Read server-only process.env.ADMIN_SECRET_KEY       │
│ 3. Inject x-admin-key header into upstream request     │
└────────────────┬───────────────────────────────────────┘
                 │ x-admin-key: <ADMIN_SECRET_KEY>
                 │ Authorization: Bearer <session_token>
                 ▼
┌────────────────────────────────────────────────────────┐
│ Upstream Production Backend                            │
│ (https://reposnse-ishaara.onrender.com/api/v1)         │
│                                                        │
│ - Payments Controller & Settlement Service              │
│ - Atomic Database Lease Locks                          │
│ - Razorpay Route Payout Integration                     │
│ - Double-Entry Ledger System                           │
└────────────────────────────────────────────────────────┘
```

---

## 3. Implemented Routes & Navigation

| Route | Security Guard | Purpose |
|---|---|---|
| `/admin` | `AdminGuard` | Redirects to `/admin/settlements` |
| `/admin/settlements` | `AdminGuard` | Platform settlement operations console, status filtering, batch process trigger, reconciliation sweep trigger |
| `/admin/settlements/[settlementId]` | `AdminGuard` | Settlement detail inspection, banking credential review, state-aware mutation console (`Process`, `Retry`, `Reconcile`) |
| `/admin/reconciliation` | `AdminGuard` | 7-point financial invariant integrity audit viewer, discrepancy inspection, sweep action |

---

## 4. State-Aware Administrative Mutations

### 4.1 Process Settlement
- **Eligible State:** `PENDING`
- **Modal Confirmation:** Displays Settlement ID, Payment ID, Net Minor Amount, and warns that this initiates an irrevocable financial bank transfer via Razorpay Route.
- **Backend Action:** Acquires atomic database lease lock, writes ledger entries, executes provider transfer.
- **Handling:** Button disabled during in-flight request, handles `409 Conflict` (lease already held by another worker), invalidates query cache, refetches authoritative status.

### 4.2 Retry Failed Settlement
- **Eligible State:** `FAILED`
- **Modal Validation:** Requires mandatory administrative reason input (`reason` textarea with min 3 characters).
- **Backend Action:** Clears failure flag, resets settlement status to `PENDING` for re-execution, records reason in ledger audit trail.

### 4.3 Reconcile Settlement
- **Eligible States:** `PROCESSED`, `FAILED`
- **Modal Confirmation:** Explains provider status query.
- **Backend Action:** Queries Razorpay Route API, compares clearing state, repairs database record.

### 4.4 Batch Process Settlements
- **Location:** Top action bar in `/admin/settlements`.
- **Modal Confirmation:** High-impact warning detailing that all eligible unleased `PENDING` settlements will be processed.
- **Result Metrics:** Displays backend-reported `processed`, `succeeded`, and `failed` counts.

### 4.5 Automated Reconciliation Sweep
- **Location:** Available in `/admin/settlements` and `/admin/reconciliation`.
- **Backend Action:** Scans and releases expired worker leases (>15 minutes) and synchronizes pending transfer webhooks.

---

## 5. 7-Point Reconciliation Invariants

The `/admin/reconciliation` audit console evaluates seven critical financial integrity conditions enforced by the backend:
1. **Amount Mismatch:** Settlement amount vs payment gateway provider net.
2. **Currency Mismatch:** Non-INR or mismatched currency code.
3. **Stale Processing Lease:** Worker lease age > 15 minutes without status transition.
4. **Missing Payment Reference:** Settlement record without linked payment ID.
5. **Operator KYC Verification:** Payout account clearance and bank IFSC validity.
6. **Missing Provider Reference:** Processed settlement missing gateway transfer ID.
7. **Post-Settlement Refund:** Payment refund issued after payout dispatch.
