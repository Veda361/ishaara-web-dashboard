# ISHAARA FRONTEND PHASE A17 — AGENCY OWNER WEB DASHBOARD

**Platform:** ISHAARA Mobility / Shared Transit Platform  
**Backend:** `https://reposnse-ishaara.onrender.com`  
**API Prefix:** `/api/v1`  
**Authentication:** Better Auth / Bearer session-based authentication  
**Audience:** Agency Owners managing mobility fleets  
**Status:** IMPLEMENTED, TESTED & PRODUCTION VERIFIED

---

## 1. ARCHITECTURE OVERVIEW

The ISHAARA platform architecture cleanly separates the end-user Android application (Passengers and Drivers) from the enterprise **Agency Owner Web Dashboard**.

```
    ┌──────────────────────┐
    │     Android App      │
    │ USER / DRIVER        │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │   ISHAARA BACKEND    │
    │ /api/v1              │
    └──────────┬───────────┘
               ▲
               │
    ┌──────────┴───────────┐
    │  AGENCY WEB DASHBOARD│
    │    AGENCY OWNER      │
    └──────────────────────┘
```

The web dashboard is an isolated Next.js 16 (App Router) enterprise application written in strict TypeScript. It communicates exclusively with the authoritative backend without introducing competing client-side business logic or mock APIs.

---

## 2. SECURITY & TENANT ISOLATION MODEL

### 2.1 Authoritative Authentication Pipeline
```
[Login Form]
     │
     ▼
Better Auth (/api/auth/sign-in/*) ──► session token issued
     │
     ▼
Session Restoration (/api/auth/get-session)
     │
     ▼
Authoritative User Profile (GET /api/v1/users/me)
     │
     ▼
Owned Agency Resolution (GET /api/v1/agencies/me/owned)
     │
     ├─ [No owned agency] ──────► Register Agency / Access Denied
     │
     └─ [Owned agency exists] ──► Active Agency Context Loaded -> /dashboard
```

### 2.2 Strict Role-Based Access Control
- `USER` (Passenger): Access blocked -> redirected to `/unauthorized`.
- `DRIVER_CONDUCTOR` (Driver): Access blocked -> redirected to `/unauthorized` (instructed to use Android app).
- `AGENCY_OWNER`: Authorized only for agencies they own.
- Tenant Isolation: Scopes all resource requests to `/api/v1/agencies/:id/*`. Client query manipulation or tampering with agency IDs is blocked.

---

## 3. CORE DOMAIN SEPARATIONS

1. **Agency Membership Approval != Driver Platform Verification:**
   - Approving a driver into an agency fleet authorizes vehicle assignments within that agency.
   - Platform KYC verification (`verificationStatus: VERIFIED`) is audited independently by platform administration.
2. **Vehicle != DriverVehicleAssignment:**
   - `Vehicle` represents a physical asset.
   - `DriverVehicleAssignment` is the authoritative driver ↔ vehicle relationship record.
3. **Agency != BusOperator:**
   - BusOperator is an administrative settlement entity with verified bank credentials. Agency owners do not manage operator bank accounts.
4. **Driver Earnings != Agency Settlements:**
   - Driver earnings are individual driver earnings (Phase 16). Agency settlement and payout tracking are handled independently.

---

## 4. DASHBOARD PAGES & FEATURES

| Route | Purpose | Key Features |
| :--- | :--- | :--- |
| `/login` | Authentication Portal | Email OTP verification, direct session token authentication, resend timer, error normalization |
| `/dashboard` | Fleet Overview | Realtime metrics from `/api/v1/agencies/:id/manage`, pending driver queue, quick dispatch links |
| `/dashboard/drivers` | Fleet Drivers List | Status tabs (All, Pending, Approved, Rejected), server pagination, search, responsive cards for mobile |
| `/dashboard/drivers/[id]` | Driver Review & Detail | Profile inspection, platform KYC badge, Approve Modal with optional notes, Reject Modal with mandatory reason, 409 conflict handling |
| `/dashboard/vehicles` | Fleet Asset Management | Registered vehicles list, Add Vehicle modal (bus, minibus, van), activation/deactivation toggles |
| `/dashboard/vehicles/[id]` | Vehicle Detail | Specifications, active driver assignment, assignment history |
| `/dashboard/assignments` | Driver-Vehicle Pairing | Active assignments table, Assign Driver modal (with validation and conflict protection), Unassign action |
| `/dashboard/trips` | Fleet Trips & Dispatch | Dispatched trips table, Dispatch Trip modal (origin, destination, vehicle, driver), Cancel Trip dialog |
| `/dashboard/operations` | Operations Control | REST-refreshed operational telemetry (30s cycle), Phase 07 readiness checklist |
| `/dashboard/settings` | Agency Settings | Update agency contact metadata, register secondary agency |
| `/unauthorized` | 403 Forbidden Page | Guidance directing drivers/passengers to the ISHAARA Android mobile app |

---

## 5. DESIGN SYSTEM SPECIFICATIONS

- **Background:** `#F8F9FC`
- **Primary:** Deep navy / indigo (`#0F172A`, `#1E293B`, `#4338CA`)
- **Accent:** ISHAARA violet (`#6366F1`)
- **Success:** Soft green (`#10B981`, `#ECFDF5`)
- **Warning:** Soft amber (`#F59E0B`, `#FFFBEB`)
- **Danger:** Soft red (`#EF4444`, `#FEF2F2`)
- **Typography:** System-native high legibility sans-serif
- **Corners:** 12–20px rounded cards (`rounded-2xl`)
- **Tables:** Responsive with desktop table and mobile card layouts.
