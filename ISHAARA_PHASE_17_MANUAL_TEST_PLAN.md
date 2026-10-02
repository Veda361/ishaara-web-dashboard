# ISHAARA FRONTEND PHASE A17 — MANUAL QA TEST PLAN

## 1. AUTHENTICATION & SESSION MANAGEMENT
- [ ] **Email OTP Request:** Enter valid email in `/login`. Verify "One-time verification code sent" banner appears.
- [ ] **OTP Sign-In:** Enter 6-digit code. Verify session token is acquired and dashboard loads without auth flicker.
- [ ] **Direct Token Login:** Click "Use Session Token", enter valid token. Verify immediate session restoration.
- [ ] **Session Restoration:** Refresh `/dashboard`. Verify active agency and user profile restore without redirecting to `/login`.
- [ ] **Sign Out:** Click "Sign Out" in sidebar footer. Verify session token is removed and user is redirected to `/login`.
- [ ] **Role Protection (USER):** Log in as a passenger. Verify immediate redirect to `/unauthorized` with message explaining mobile app usage.
- [ ] **Role Protection (DRIVER_CONDUCTOR):** Log in as driver. Verify immediate redirect to `/unauthorized`.

## 2. AGENCY DASHBOARD & OVERVIEW
- [ ] **Dashboard Metrics Load:** Verify Active Drivers, Fleet Vehicles, Active Trips, and Pending Applications display backend data.
- [ ] **Quick Action Links:** Click "Manage Drivers", "Fleet Assets", and "Assign Driver". Verify correct navigation.
- [ ] **Pending Queue:** Verify pending driver cards render with "Review Application" buttons.
- [ ] **Multi-Agency Switching:** (If user owns >1 agency) Click agency pill in sidebar, select another agency. Verify context reloads.

## 3. DRIVER FLEET MANAGEMENT
- [ ] **Status Filtering:** Click tabs "All", "Pending", "Approved", "Rejected". Verify table updates with appropriate records.
- [ ] **Search:** Type driver name in search input. Verify instant filtering.
- [ ] **Driver Details View:** Click "Details" on any driver. Verify profile, platform KYC badge, and membership dates render.
- [ ] **Approve Driver:** Click "Approve Driver", enter optional notes, confirm. Verify success toast, query invalidation, and status changes to ACTIVE.
- [ ] **Reject Driver:** Click "Reject Driver", enter reason, confirm. Verify status changes to REJECTED.
- [ ] **Conflict Handling (409):** Simulate concurrent processing. Verify warning alert: "This membership has already been processed. Refresh to view the latest status."

## 4. FLEET VEHICLES
- [ ] **Register Vehicle:** Click "Add Vehicle", fill in Registration Number, Model, Type (Bus/Minibus/Van), and Capacity. Verify vehicle appears in list.
- [ ] **Vehicle Detail:** Click "Details" on a vehicle. Verify specifications, current driver assignment, and assignment history.
- [ ] **Activate / Deactivate:** Toggle vehicle status. Verify badge changes between ACTIVE and INACTIVE.

## 5. DRIVER-VEHICLE ASSIGNMENTS
- [ ] **Assign Driver:** Click "Assign Driver", select available vehicle and approved driver. Confirm assignment. Verify active pairing appears in table.
- [ ] **Conflict Guard:** Attempt to assign an already assigned driver. Verify backend 409 conflict message displays clearly.
- [ ] **Unassign Driver:** Click "Unassign" on active pairing. Verify vehicle becomes unassigned and assignment record transitions to TERMINATED.

## 6. FLEET DISPATCH & TRIPS
- [ ] **Dispatch Trip:** Click "Dispatch Trip", enter origin, destination, select vehicle and driver. Confirm dispatch. Verify trip appears in table in SCHEDULED status.
- [ ] **Cancel Trip:** Click "Cancel" on a scheduled trip, enter reason. Verify status transitions to CANCELLED.

## 7. OPERATIONS CONTROL
- [ ] **REST Sync:** Verify 30s cycle poll updates operational counts. Click "Sync Now" to verify manual refresh.
- [ ] **Readiness Checklist:** Verify 4 prerequisites (KYC, Pairing, Zero Suspension, Agency Approved) render clearly.

## 8. RESPONSIVENESS & ACCESSIBILITY
- [ ] **Desktop (1440px / 1280px):** Verify persistent sidebar, aligned tables, and clear visual hierarchy.
- [ ] **Tablet (1024px / 768px):** Verify responsive grid collapse.
- [ ] **Mobile (390px):** Open mobile viewport. Verify sidebar collapses to hamburger drawer, and tables render as card lists.
- [ ] **Keyboard Navigation:** Tab through login form and modal dialogs. Verify visible focus rings and Escape key closing.
