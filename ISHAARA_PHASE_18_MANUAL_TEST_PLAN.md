# ISHAARA FRONTEND PHASE A18 — SETTLEMENT MANUAL QA TEST PLAN

## 1. AUTHENTICATION & ACCESS CONTROL
- [ ] **Access Authorization:** Log in as authorized Agency Owner. Navigate to `/dashboard/settlements`. Verify page loads without access errors.
- [ ] **Passenger Blocking:** Log in as `USER`. Attempt direct navigation to `/dashboard/settlements`. Verify redirect to `/unauthorized`.
- [ ] **Driver Blocking:** Log in as `DRIVER_CONDUCTOR`. Attempt direct navigation to `/dashboard/settlements`. Verify redirect to `/unauthorized`.
- [ ] **Session Expiry:** Expire session token. Verify settlements view redirects to `/login` without displaying cached data.

## 2. SETTLEMENT FINANCIAL OVERVIEW
- [ ] **Authoritative Minor-Unit Formatting:** Verify Total Settled, Pending Settlement, and Failed Transfers display values formatted as Indian Rupees (e.g. `₹4,500.00`) and never raw minor numbers (e.g. `450000`).
- [ ] **Zero Floating-Point Drift:** Verify fractional paise do not display floating-point artifacts (e.g. `₹40.50` rather than `₹40.4999999`).
- [ ] **Sync Action:** Click "Refresh" in the financial standard banner. Verify summary metrics refetch from backend.

## 3. SETTLEMENT HISTORY TABLE
- [ ] **Status Filtering:** Click tabs `ALL`, `PROCESSED`, `PENDING`, `FAILED`. Verify settlement table updates with matching records.
- [ ] **Status Badges:** Verify `PROCESSED` renders green, `PENDING` renders amber, `FAILED` renders red, and `PROCESSING` renders blue.
- [ ] **Server Pagination:** Verify pagination controls (`Previous`, `Next`) page through records if count > 10.
- [ ] **Empty State:** Filter to a status with zero records (e.g. `FAILED`). Verify clean empty state: "No settlement records found".

## 4. SETTLEMENT DETAIL INSPECTION
- [ ] **Inspect Action:** Click "Inspect" on any settlement row. Verify navigation to `/dashboard/settlements/[settlementId]`.
- [ ] **Metadata Audit:** Verify Settlement ID, Payment Reference, Operator ID, Driver ID, and Creation Timestamp match backend data.
- [ ] **Masked Bank Account:** Verify payout account renders masked number (`****1234`) and valid IFSC.
- [ ] **Back Navigation:** Click "Back to Settlements". Verify return to list view.

## 5. 7-POINT RECONCILIATION AUDIT
- [ ] **Tab Switch:** Click "7-Point Reconciliation Audit" tab.
- [ ] **Invariant Standards:** Verify the 7 double-entry invariants (Amount, Currency, Stale Lease, Payment Ref, KYC Check, Provider Confirmation, Post-Settlement Refund) are documented with checkmarks.
- [ ] **Privilege Transparency:** Verify audit privilege notice clarifies administrative audit requirements.

## 6. TENANT ISOLATION
- [ ] **Agency Switch:** If user owns multiple agencies, switch active agency in sidebar. Verify settlement queries re-scope to the newly active agency.
- [ ] **URL Manipulation Guard:** Manually alter URL to query an unauthorized operator ID. Verify backend rejects unauthorized query or client scopes strictly to active context.

## 7. RESPONSIVENESS & ACCESSIBILITY
- [ ] **Desktop (1440px / 1280px):** Verify clear table layout and metric cards grid.
- [ ] **Mobile (390px):** Verify table scrolls horizontally or collapses cleanly without breaking viewport bounds.
- [ ] **Contrast & Screen Reader:** Verify financial amounts have sufficient contrast and clear aria labels.
