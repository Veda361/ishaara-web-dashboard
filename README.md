# ISHAARA Agency Owner Web Dashboard

Production web dashboard for mobility agency owners on the **ISHAARA** Shared Transit Platform.

## Platform Architecture
ISHAARA consists of two distinct frontend products communicating with the production backend:
1. **Android Application**: Passenger (`USER`) and Driver/Conductor (`DRIVER_CONDUCTOR`).
2. **Web Dashboard**: Agency Owners (`AGENCY_OWNER`) managing fleets, drivers, vehicles, assignments, trips, and settlements.

**Backend Production Host:** `https://reposnse-ishaara.onrender.com`  
**API Prefix:** `/api/v1`  
**Authentication:** Better Auth Bearer session tokens (`/api/auth/*`)

---

## Phases Implemented

### Phase A17 — Agency Owner Web Dashboard
- Authoritative authentication and session restoration via Better Auth.
- Agency tenancy resolution (`GET /api/v1/agencies/me/owned`) with strict IDOR defense.
- Fleet Drivers Management: Application review, approve/reject dialogs with notes and 409 conflict handling.
- Fleet Vehicles Management: Asset inventory, registration, activation/deactivation.
- Authoritative Driver ↔ Vehicle Assignments.
- Agency Fleet Trip Dispatch and cancellation.
- Operations telemetry with REST polling indicators (30s cycle).
- Agency metadata and multi-agency context switching.

### Phase A18 — Settlement & Reconciliation UI
- Authoritative Integer Minor-Unit (Paise) money formatting (`formatMoneyMinor`).
- Zero floating-point arithmetic drift on monetary calculations.
- Settlement overview metrics (Total Settled, Pending Settlement, Failed Transfers).
- Filterable and paginated settlement history table.
- Detailed settlement inspection view with masked bank accounts (`****1234`).
- 7-Point Double-Entry Ledger Reconciliation Invariants inspection view.
- Strict domain separation from Phase A16 (Driver Earnings) and Phase A19 (Administrative Operations).

### Phase A19 — Admin Operations & Settlement Control Center
- Dedicated Platform Administrative Control Center (`/admin/settlements`, `/admin/reconciliation`).
- Strict server-side proxy pattern via Next.js Route Handlers (`/api/admin/settlements/*`) ensuring zero client exposure of `x-admin-key`.
- Dual-gate authorization: client-side `AdminGuard` and server-side session role validation.
- State-aware financial mutations:
  - `Process Settlement` (PENDING) with atomic lease protection and provider transfer dispatch.
  - `Retry Settlement` (FAILED) with mandatory administrative audit reason validation.
  - `Reconcile Settlement` (PROCESSED / FAILED) querying provider clearing records.
  - `Batch Process Settlements` sweeping all eligible pending payouts.
  - `Reconciliation Sweep` re-claiming hung worker leases (>15 min) and syncing transfers.
- 7-point financial invariant integrity audit viewer with real-time discrepancy inspection.
- Complete regression safety preserving A17 and A18 suites.

---

## Setup & Running

### Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Ensure `NEXT_PUBLIC_API_BASE_URL` is set:
```env
NEXT_PUBLIC_API_BASE_URL=https://reposnse-ishaara.onrender.com
# Server-side ONLY administrative secret key
ADMIN_SECRET_KEY=
```

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Verification & Testing
```bash
# Typecheck
npm run typecheck

# Linting
npm run lint

# Unit & Contract Tests
npm test

# Production Build
npm run build
```

---

## Documentation Index
- `ISHAARA_FRONTEND_PHASE_A17_FORENSIC_AUDIT.md`: Forensic audit for Phase A17.
- `ISHAARA_FRONTEND_PHASE_A17_API_CONTRACT.md`: Authoritative API contract for Phase A17.
- `ISHAARA_FRONTEND_PHASE_A17_AGENCY_DASHBOARD.md`: Architecture guide for Phase A17.
- `ISHAARA_FRONTEND_PHASE_A17_CHANGELOG.md`: Phase A17 Changelog.
- `ISHAARA_PHASE_17_MANUAL_TEST_PLAN.md`: Phase A17 Manual QA Checklist.
- `ISHAARA_FRONTEND_PHASE_A18_FORENSIC_AUDIT.md`: Forensic audit for Phase A18.
- `ISHAARA_FRONTEND_PHASE_A18_API_CONTRACT.md`: Authoritative API contract for Phase A18.
- `ISHAARA_FRONTEND_PHASE_A18_SETTLEMENT_RECONCILIATION.md`: Architecture guide for Phase A18.
- `ISHAARA_FRONTEND_PHASE_A18_CHANGELOG.md`: Phase A18 Changelog.
- `ISHAARA_PHASE_18_MANUAL_TEST_PLAN.md`: Phase A18 Manual QA Checklist.
- `ISHAARA_FRONTEND_PHASE_A19_FORENSIC_AUDIT.md`: Forensic audit for Phase A19.
- `ISHAARA_FRONTEND_PHASE_A19_API_CONTRACT.md`: Authoritative API contract for Phase A19.
- `ISHAARA_FRONTEND_PHASE_A19_ADMIN_OPERATIONS.md`: Architecture guide for Phase A19.
- `ISHAARA_FRONTEND_PHASE_A19_SECURITY_AUDIT.md`: Dedicated administrative security audit.
- `ISHAARA_FRONTEND_PHASE_A19_CHANGELOG.md`: Phase A19 Changelog.
- `ISHAARA_PHASE_19_MANUAL_TEST_PLAN.md`: Phase A19 Manual QA Checklist.

