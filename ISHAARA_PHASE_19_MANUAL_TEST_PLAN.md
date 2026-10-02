# ISHAARA FRONTEND PHASE A19 — MANUAL TEST PLAN & QA RUNBOOK
**Phase:** A19 — Admin Operations & Settlement Control Center  
**Environment:** Next.js Production Web Dashboard  
**Date:** 2026-10-02  
**Tester Profile:** Quality Assurance & Security Validation Engineer

---

## 1. Authentication & Role Boundary Tests

### Test 1.1: Direct URL Access — Unauthenticated User
- **Action:** Open an incognito browser window without signing in. Directly navigate to `/admin/settlements`.
- **Expected Behavior:** `AdminGuard` immediately intercepts navigation and redirects to `/login`. No admin UI or settlement data flashes on the screen.
- **Pass/Fail Criteria:** Pass if redirected to `/login` without data leakage.

### Test 1.2: Direct URL Access — Passenger (`USER`) Role
- **Action:** Sign in as a standard passenger account (`role: USER`). Manually type `/admin/settlements` in the browser address bar.
- **Expected Behavior:** `AdminGuard` detects `user.role !== "ADMIN"`, displays the "Administrative Access Restricted" institutional screen, and offers a button to return to the dashboard.
- **Pass/Fail Criteria:** Pass if all settlement operations and data are completely inaccessible.

### Test 1.3: Direct URL Access — Driver (`DRIVER_CONDUCTOR`) Role
- **Action:** Sign in as a driver conductor account. Navigate to `/admin/reconciliation`.
- **Expected Behavior:** Intercepted by `AdminGuard`. Displays access restricted terminal.
- **Pass/Fail Criteria:** Pass if no audit data is disclosed.

### Test 1.4: Direct URL Access — Agency Owner (`AGENCY_OWNER`) Role
- **Action:** Sign in with a verified agency owner account. Attempt to visit `/admin/settlements`.
- **Expected Behavior:** Intercepted by `AdminGuard`. Agency owners can only operate `/dashboard/settlements` and are strictly barred from platform administration.
- **Pass/Fail Criteria:** Pass if agency owner is blocked.

### Test 1.5: Authenticated Administrator (`ADMIN`) Role
- **Action:** Sign in as a user with `role: ADMIN`. Navigate to `/admin/settlements`.
- **Expected Behavior:** TopNav shows "Settlement Control Center", sidebar shows "Admin Console", table populates with platform settlements.
- **Pass/Fail Criteria:** Pass if admin operations console loads cleanly.

---

## 2. Settlement Lifecycle Mutation Tests

### Test 2.1: Process Single Settlement (`PENDING` state)
- **Precondition:** Settlement in `PENDING` status selected.
- **Action:**
  1. Click "Inspect" to view settlement detail page.
  2. Verify only "Process Settlement" button is active (Retry and Reconcile must not appear).
  3. Click "Process Settlement".
  4. Verify modal pops up showing Settlement ID, Payment ID, and Net Minor Amount.
  5. Click "Process Settlement" in the modal.
- **Expected Behavior:**
  - Button enters loading state ("Processing Payout..."). Duplicate clicks prevented.
  - Upon backend response, query cache is invalidated and page refetches authoritative state.
  - Success banner displays transition to `PROCESSED` with provider transfer ID.
- **Pass/Fail Criteria:** Pass if status updates from backend and duplicate execution is prevented.

### Test 2.2: Retry Failed Settlement (`FAILED` state)
- **Precondition:** Settlement in `FAILED` status selected.
- **Action:**
  1. On detail page, verify "Retry Settlement" and "Reconcile State" buttons are present; "Process Settlement" is absent.
  2. Click "Retry Settlement".
  3. Leave "Administrative Retry Reason" blank and click submit.
  4. Verify validation error: "A valid administrative reason (at least 3 characters) is required."
  5. Type a valid reason (e.g., "Bank IFSC code verified by compliance") and submit.
- **Expected Behavior:**
  - Submits `{ "reason": "Bank IFSC code verified by compliance" }` to `/api/admin/settlements/:id/retry`.
  - Refetches record and shows status updated to `PENDING`.
- **Pass/Fail Criteria:** Pass if validation blocks empty reason and retry succeeds.

### Test 2.3: Reconcile Settlement (`PROCESSED` or `FAILED` state)
- **Action:** Click "Reconcile State", read confirmation description, confirm.
- **Expected Behavior:** Calls `/api/admin/settlements/:id/reconcile`. Refetches backend state. Displays reconciled clearing status.
- **Pass/Fail Criteria:** Pass if reconciliation completes without errors.

### Test 2.4: Active Processing Lease Lock (`PROCESSING` state)
- **Precondition:** Settlement in `PROCESSING` status.
- **Action:** Inspect settlement detail page.
- **Expected Behavior:** Displays badge `PROCESSING (LEASE ACQUIRED)`. Mutation buttons are replaced with a locked banner: "No mutations permitted in PROCESSING status".
- **Pass/Fail Criteria:** Pass if locked state prevents any client mutation trigger.

---

## 3. High-Impact Batch & Sweep Operations

### Test 3.1: Execute Batch Settlement Dispatch
- **Action:**
  1. On `/admin/settlements`, click "Batch Process Settlements".
  2. Read high-impact warning modal.
  3. Confirm execution.
- **Expected Behavior:**
  - Loading spinner displayed during batch sweep.
  - Backend response returned: shows exact `processed`, `succeeded`, and `failed` count cards.
  - Settlement table auto-refreshes.
- **Pass/Fail Criteria:** Pass if batch results match backend response accurately.

### Test 3.2: Automated Reconciliation Sweep
- **Action:**
  1. On `/admin/reconciliation`, click "Run Sweep".
  2. Confirm sweep execution.
- **Expected Behavior:**
  - Calls `/api/admin/settlements/reconciliation/sweep`.
  - Displays count of released stale leases and synchronized provider transfers.
  - 7-point audit metrics refresh automatically.
- **Pass/Fail Criteria:** Pass if sweep completes and cache refreshes.

---

## 4. Security & Zero-Leakage Verification

### Test 4.1: Network Inspection for `x-admin-key`
- **Action:** Open Chrome DevTools Network Tab. Execute "Process Settlement", "Batch Process", and "Reconcile".
- **Inspection:** Inspect Request Headers for every client fetch.
- **Expected Result:** Headers contain `Authorization: Bearer <session_token>`. The header `x-admin-key` is **NEVER present** in any browser request.
- **Pass/Fail Criteria:** Pass if `x-admin-key` is 100% absent from all client network traffic.

### Test 4.2: Storage Inspection
- **Action:** In DevTools Application Tab, inspect `localStorage`, `sessionStorage`, and `IndexedDB`.
- **Expected Result:** Zero keys containing "admin", "secret", or "x-admin-key".
- **Pass/Fail Criteria:** Pass if zero privileged secrets exist in client storage.

### Test 4.3: Console & Log Inspection
- **Action:** In DevTools Console Tab, perform full walkthrough of all admin pages.
- **Expected Result:** Zero console logs or errors emitting secrets or internal API paths.
- **Pass/Fail Criteria:** Pass if console remains clean.

---

## 5. Financial Precision Verification

### Test 5.1: Minor Unit Money Formatting
- **Data Points:**
  - 0 -> ₹0.00
  - 1 -> ₹0.01
  - 10 -> ₹0.10
  - 99 -> ₹0.99
  - 100 -> ₹1.00
  - 101 -> ₹1.01
  - 1000 -> ₹10.00
  - 4050 -> ₹40.50
  - 450000 -> ₹4,500.00
- **Pass/Fail Criteria:** Pass if formatted exclusively with integer division and zero floating-point drift.
