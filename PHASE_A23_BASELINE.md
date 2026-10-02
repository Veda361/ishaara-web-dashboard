# PHASE A23 — BASELINE AUDIT
## ISHAARA WEB DASHBOARD — PRODUCTION UAT & END-TO-END STABILIZATION

**Date:** 2026-10-02  
**Repository:** `/home/dev/ishara-web-dashboard`  
**Git Branch:** `main` (clean working directory, initial commit pending)  
**Package Version:** `1.0.0` (`ishaara-agency-dashboard`)  
**Framework Stack:** Next.js 16.3.8 (App Router), React 19.2.8, React DOM 19.2.8, TypeScript 5.x, Node.js 22 LTS  
**State & Data Fetching:** TanStack Query 5.104.0  
**Styling:** Tailwind CSS 4 with `@tailwindcss/postcss`  
**Testing Framework:** Vitest 5.0.3 with jsdom 29.1.1  

---

### 1. Environment & Runtime Commands
- **Dev Server:** `npm run dev` (`next dev`)
- **Production Build:** `npm run build` (`next build`)
- **Production Start:** `npm run start` (`next start -p 3000`)
- **Linter:** `npm run lint` (`eslint`)
- **Type Checker:** `npm run typecheck` (`tsc --noEmit`)
- **Test Command:** `npm test` (`vitest run`)

---

### 2. Environment Variables Configuration
- **Public Client Variables:**
  - `NEXT_PUBLIC_API_BASE_URL`: Authoritative backend endpoint (`https://reposnse-ishaara.onrender.com`).
- **Private Server-Only Variables:**
  - `ADMIN_SECRET_KEY`: Authoritative institutional platform secret for injecting `x-admin-key` in `adminProxy.ts`.
  - `INTERNAL_API_BASE_URL`: Optional private cluster backend target.
  - `NODE_ENV`: Set to `production` in release deployment.
  - `PORT`: Service port (default `3000`).

---

### 3. Route & Component Architecture Inventory
The dashboard compiles cleanly into 22 distinct static and dynamic route trees:

#### Public Routes:
- `/`: Entry redirect to `/dashboard` (if authenticated) or `/login`.
- `/login`: Multi-mode authentication portal (Email OTP verification + Direct Session Bearer Token input).
- `/unauthorized`: Safe 403 fallback route.
- `/api/health`: Health probe endpoint (`GET /api/health` for process liveness; `GET /api/health?full=true` for backend readiness).

#### Agency Owner Dashboard Subsystem (`/dashboard`):
- `/dashboard`: High-level operational summary, active fleets, revenue, and alerts.
- `/dashboard/drivers` & `/dashboard/drivers/[id]`: Driver roster, approval state, and KYC inspection.
- `/dashboard/vehicles` & `/dashboard/vehicles/[id]`: Vehicle fleet management and active telemetry.
- `/dashboard/assignments`: Vehicle-to-driver dispatch assignments.
- `/dashboard/operations`: Real-time active trips and fleet route monitoring.
- `/dashboard/trips`: Completed and in-flight transit trips history.
- `/dashboard/settlements` & `/dashboard/settlements/[settlementId]`: Transit operator financial payouts and bank receipt inspection.
- `/dashboard/settings`: Operator profile and payout beneficiary credentials.

#### Platform Administrative Console (`/admin`):
- `/admin`: Root redirect to `/admin/settlements`.
- `/admin/settlements`: Platform-wide settlement dispatch, status filters, and batch processing sweeps.
- `/admin/settlements/[settlementId]`: Authoritative financial lifecycle state machine (`PROCESS`, `RETRY`, `RECONCILE`).
- `/admin/reconciliation`: Authoritative 7-point double-entry financial invariant validation and worker lease sweeps.

#### Server-Side Admin Proxy Routes (`/api/admin/*`):
- `GET /api/admin/settlements`: Lists platform settlements with query filters.
- `GET /api/admin/settlements/[settlementId]`: Single settlement details.
- `POST /api/admin/settlements/[settlementId]/process`: Payout mutation dispatch.
- `POST /api/admin/settlements/[settlementId]/retry`: Retry failed settlement with audit reason.
- `POST /api/admin/settlements/[settlementId]/reconcile`: Provider gateway reconciliation.
- `POST /api/admin/settlements/batch/process`: Batch worker sweep mutation.
- `GET /api/admin/settlements/reconciliation/audit`: 7-point invariant inspection.
- `POST /api/admin/settlements/reconciliation/sweep`: Stale lease clearing (>15 min) and webhook sync.

---

### 4. Security & Observability Baseline
- **Secret Isolation:** `ADMIN_SECRET_KEY` is strictly server-side. Zero occurrences of `ADMIN_SECRET_KEY` or `x-admin-key` exist in `.next/static`.
- **Server Role Guarding:** `verifyAdminSession()` verifies the caller's session against `/api/v1/users/me` on every administrative proxy request.
- **Structured JSON Logging:** Emits single-line JSON with automatic secret redaction (`src/lib/server/logger.ts`).
- **Request Correlation:** Generates and propagates `X-Request-ID` across client, Next.js server, and upstream backend.
- **Error Boundaries:** `ErrorBoundary` protects `/admin` from unhandled UI crashes.
- **Health Widget:** Real-time `SystemHealthStatus` widget integrated into `AdminTopNav`.

---

### 5. Automated Test Baseline
- **Total Test Suites:** 16
- **Total Tests Passing:** 91 / 91 (100% pass rate, 0 failures)
- **Typecheck Status:** 0 errors (`tsc --noEmit`)
- **Lint Status:** 0 errors (`eslint`)

---

### 6. Known External Dependencies & Risks
- **`BACKEND-AUTH-CORS-001`:** Upstream Better Auth `/api/auth/email-otp/send-verification-otp` returns HTTP 500 on OPTIONS preflight and POST without `Access-Control-Allow-Origin` headers. Re-tested and confirmed open. Workaround: Direct session token authentication is available on `/login`.
- **Render Hibernation:** Cold starts on `reposnse-ishaara.onrender.com` may return HTTP 503 until backend instances wake up.
