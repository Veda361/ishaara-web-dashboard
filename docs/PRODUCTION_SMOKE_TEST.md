# ISHAARA Web Dashboard — Production Smoke Test Runbook

> **Phase:** A25 — Production Launch & Operational Verification  
> **Document:** Production Smoke Test Runbook  
> **Version:** 1.0.0  
> **Target Audience:** Release Engineers, QA Leads, DevOps, Support Engineers  

---

## Pre-Flight Check

Before executing the manual smoke test suite:
1. Verify the production application is running:
   ```bash
   curl -sI https://<production-domain>/api/health | head -n 1
   # Expected: HTTP/1.1 200 OK (or HTTP/2 200)
   ```
2. Verify security headers:
   ```bash
   curl -sI https://<production-domain>/ | grep -i -E "x-content-type|x-frame|strict-transport|content-security"
   ```
3. Prepare test credentials:
   - Valid Agency Owner Session Token
   - Valid Platform Admin Session Token
   - Valid Passenger/Driver Session Token (for negative RBAC test)

---

## Manual Smoke Test Protocol

### TEST 1 — LANDING PAGE & ASSET INTEGRITY
- **Target URL:** `https://<production-domain>/`
- **Steps:**
  1. Open a clean browser window (Incognito / Private mode).
  2. Navigate to `https://<production-domain>/`.
  3. Open Browser Developer Tools → Console & Network tabs.
- **Expected Results:**
  - Page redirects cleanly to `/login` (or `/dashboard` if previously authenticated).
  - No uncaught JavaScript exceptions or runtime red screens.
  - All CSS stylesheets, SVGs, and font files load with `HTTP 200` (or `304 Not Modified`).
  - No mixed content warnings (`http://` over `https://`).
  - Strict-Transport-Security and CSP headers present in network inspection.

---

### TEST 2 — AUTHENTICATION & LOGIN (WORKAROUND PATH)
- **Target URL:** `https://<production-domain>/login`
- **Steps:**
  1. View `/login`. Verify the login screen renders title, explanation banner, and direct token authentication option.
  2. Paste a valid Agency Owner session token into the session token field.
  3. Click **Authenticate**.
- **Expected Results:**
  - `GET /api/v1/users/me` fires with header `Authorization: Bearer <token>`.
  - On `200 OK`, `AuthContext` receives the user profile and loads owned agencies via `/api/v1/agencies/owned`.
  - Browser transitions to `/dashboard` smoothly without full page reload errors.
  - Active agency name appears in top navigation and sidebar.

---

### TEST 3 — PAGE REFRESH & PERSISTENCE
- **Target URL:** `https://<production-domain>/dashboard`
- **Steps:**
  1. While authenticated on `/dashboard`, press `Cmd+R` / `F5` / browser hard reload.
- **Expected Results:**
  - Screen displays loader: *"Verifying authoritative agency credentials..."*.
  - Token restored from `localStorage`.
  - Session validated against `/api/v1/users/me`.
  - User remains on `/dashboard` with full agency context intact.
  - No flicker to login or `/unauthorized`.

---

### TEST 4 — DASHBOARD OVERVIEW & METRICS
- **Target URL:** `https://<production-domain>/dashboard`
- **Steps:**
  1. Inspect the Dashboard Home view.
  2. Verify top statistics cards: Active Vehicles, Registered Drivers, Completed Trips, Pending Settlements.
- **Expected Results:**
  - Metrics are populated from backend API query (`agency-manage`, `agency-operations-metrics`).
  - Numbers match backend data; no mocked or hardcoded numbers appear.
  - If agency has no data, clean empty state is displayed with actionable call-to-action.
  - If network drops, graceful error card renders without crashing the layout.

---

### TEST 5 — DRIVERS MANAGEMENT
- **Target URL:** `https://<production-domain>/dashboard/drivers`
- **Steps:**
  1. Navigate to `/dashboard/drivers` via sidebar.
  2. Observe driver list table.
  3. Test status filter (All, Approved, Pending, Suspended).
  4. Test pagination controls (`Previous`, `Next`).
  5. Click a driver row to open `/dashboard/drivers/[id]`.
- **Expected Results:**
  - List displays drivers for the active agency only.
  - Membership status tags (APPROVED, PENDING, REJECTED) accurately reflect backend data.
  - Pagination updates URL and table without full page refresh.
  - Driver detail page loads individual profile, vehicle history, and membership action buttons.

---

### TEST 6 — VEHICLES MANAGEMENT
- **Target URL:** `https://<production-domain>/dashboard/vehicles`
- **Steps:**
  1. Navigate to `/dashboard/vehicles`.
  2. Review vehicle inventory (plate number, model, capacity, status).
  3. Click on a vehicle to open `/dashboard/vehicles/[id]`.
  4. Inspect current assignment status.
- **Expected Results:**
  - Table loads only vehicles belonging to current agency ID.
  - Active assignment shows assigned driver name and contact info.
  - Quick action buttons (Assign, Unassign) render correctly according to vehicle state.

---

### TEST 7 — TRIPS MONITORING
- **Target URL:** `https://<production-domain>/dashboard/trips`
- **Steps:**
  1. Navigate to `/dashboard/trips`.
  2. Review trip log table (Trip ID, Route, Vehicle, Driver, Status, Fare).
  3. Test date range / status filter.
- **Expected Results:**
  - Only authoritative trips from `/api/v1/agencies/{id}/trips` are displayed.
  - Fares are formatted with `formatMoneyMinor()` (e.g. `₹150.00`).
  - No raw floating-point numbers or undefined currency fields.

---

### TEST 8 — SETTLEMENTS & FINANCIAL PRECISION
- **Target URL:** `https://<production-domain>/dashboard/settlements`
- **Steps:**
  1. Navigate to `/dashboard/settlements`.
  2. Inspect Settlement Summary card (Total Disbursed, Pending Processing, Platform Fees).
  3. Inspect settlement transaction table.
  4. Click a settlement to view `/dashboard/settlements/[settlementId]`.
- **Expected Results:**
  - All amounts formatted as authoritative currency (`₹XX.XX`).
  - Frontend does NOT compute sums, tax, or fees locally.
  - Settlement statuses (`PENDING`, `PROCESSING`, `SETTLED`, `FAILED`) render with correct status badges.
  - Detail view shows reconciliation audit trace and transaction identifiers.

---

### TEST 9 — LOGOUT & ROUTE PROTECTION
- **Steps:**
  1. Click **Sign Out** / **Logout** in sidebar.
  2. Verify redirection to `/login`.
  3. Open browser console and verify storage:
     ```javascript
     localStorage.getItem("ishaara_session_token"); // null
     localStorage.getItem("ishaara_active_agency_id"); // null
     ```
  4. Attempt direct navigation to:
     - `https://<production-domain>/dashboard`
     - `https://<production-domain>/dashboard/drivers`
     - `https://<production-domain>/dashboard/settlements`
     - `https://<production-domain>/admin`
  5. Press browser **Back** button.
- **Expected Results:**
  - All attempts to access protected routes are immediately intercepted by `AuthGuard` and redirected to `/login`.
  - Browser back button does not render cached sensitive data.

---

### TEST 10 — PLATFORM ADMIN ACCESS & BOUNDARIES
- **Steps:**
  1. Authenticate with an `ADMIN` role session token.
  2. Navigate to `/admin`.
  3. Navigate to `/admin/settlements`.
  4. Attempt an invalid settlement retry with reason < 3 characters.
- **Expected Results:**
  - Admin sidebar and dark console layout load.
  - Settlement mutation options appear.
  - Client and server reject retry with: `Administrative retry reason must be at least 3 characters.`.
  - Network tab inspection verifies that `x-admin-key` is **never sent by the browser**.
