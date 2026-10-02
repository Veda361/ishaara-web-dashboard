# ISHAARA FRONTEND PHASE A19 — CHANGELOG
**Phase:** A19 — Admin Operations & Settlement Control Center  
**Date:** 2026-10-02  
**Baseline:** Phase A18 (Settlement & Reconciliation Presentation UI)

---

## Added

### 1. Server-Side Administrative Proxy
- Added `src/lib/server/adminProxy.ts` implementing the secure server-side proxy layer that injects `x-admin-key: process.env.ADMIN_SECRET_KEY` into upstream requests without exposing privileged keys to the browser.
- Added Next.js Route Handlers:
  - `src/app/api/admin/settlements/route.ts` (GET list with query params)
  - `src/app/api/admin/settlements/[settlementId]/route.ts` (GET detail)
  - `src/app/api/admin/settlements/[settlementId]/process/route.ts` (POST payout execution)
  - `src/app/api/admin/settlements/[settlementId]/retry/route.ts` (POST retry with required reason)
  - `src/app/api/admin/settlements/[settlementId]/reconcile/route.ts` (POST provider reconciliation)
  - `src/app/api/admin/settlements/batch/process/route.ts` (POST batch sweep)
  - `src/app/api/admin/settlements/reconciliation/audit/route.ts` (GET 7-point integrity audit)
  - `src/app/api/admin/settlements/reconciliation/sweep/route.ts` (POST worker lease sweep)

### 2. Administrative Security & Route Protection
- Added `src/components/layout/AdminGuard.tsx` to guard all `/admin/*` routes against unauthenticated users, passengers (`USER`), drivers (`DRIVER_CONDUCTOR`), and agency owners (`AGENCY_OWNER`).
- Added `isAdmin: boolean` helper to `AuthContext` checking `user.role === "ADMIN"`.
- Added `AdminSidebar.tsx` and `AdminTopNav.tsx` creating an institutional dark-themed financial console layout.
- Added `/admin` root redirect to `/admin/settlements`.

### 3. Administrative Control Center UI
- Added `src/app/admin/settlements/page.tsx` for platform settlement lifecycle monitoring, status filtering, batch process trigger, and reconciliation sweep trigger.
- Added `src/app/admin/settlements/[settlementId]/page.tsx` for settlement inspection and state-aware mutations:
  - `Process Settlement` (PENDING status) with confirmation modal.
  - `Retry Settlement` (FAILED status) with mandatory reason modal.
  - `Reconcile Settlement` (PROCESSED or FAILED status).
  - Explicit locking for `PROCESSING`, `NOT_READY`, `RECONCILING`.
- Added `src/app/admin/reconciliation/page.tsx` for 7-point financial invariant integrity audit monitoring and sweep dispatch.

### 4. Domain & API Extensions
- Added `BatchProcessResponse`, `BatchProcessResultItem`, `ReconciliationSweepResponse`, and `RetrySettlementPayload` interfaces to `src/types/settlement.ts`.
- Extended `settlementsApi` with admin mutation methods targeting internal server proxy routes.

### 5. Automated Test Suite (6 new suites, 27 new tests)
- `tests/AdminAuthorization.test.ts` (Role & access barrier verification)
- `tests/AdminSettlementMutation.test.ts` (Process, Retry, Reconcile, Batch, Sweep mutations)
- `tests/AdminStateAwareness.test.ts` (State machine eligibility rules)
- `tests/AdminSecretSecurity.test.ts` (Zero secret leakage verification)
- `tests/AdminConcurrentMutation.test.ts` (409 Conflict, 422 Unprocessable, 429 Rate Limit)
- `tests/AdminReconciliationAudit.test.ts` (7-point invariant integrity audit tests)

---

## Changed

- `src/lib/api/client.ts`: Updated request URL resolution to cleanly support internal relative same-origin `/api/admin` routes across browser and Node.js testing environments.
- `src/lib/auth/AuthContext.tsx`: Added `isAdmin: boolean` to `AuthContextType` and provider value.
- `src/components/layout/Sidebar.tsx`: Added conditional "Admin Console" link displayed exclusively to users with `role === "ADMIN"`.
- `.env.example`: Documented server-side only `ADMIN_SECRET_KEY` variable.

---

## Preserved Invariants
- 100% preservation of Phase A17 Agency Dashboard routes and functionality.
- 100% preservation of Phase A18 Settlement and Reconciliation presentation views.
- Strict integer minor-unit money handling (`paise` in INR) via `formatMoneyMinor()`.
- Zero floating-point math for balances.
- No backend code modified; frontend strictly adheres to backend authority.
