# ISHAARA FRONTEND PHASE A17 — CHANGELOG

## [1.0.0] - Phase A17 Release - 2026-10-02

### Added
- **Core Architecture:**
  - Initialized isolated Next.js 16 App Router web application with TypeScript and Tailwind CSS.
  - Configured `@tanstack/react-query` v5 caching and query invalidation pipelines.
  - Implemented centralized API client with timeout protection, Bearer session injection, and normalized `ApiError` handling.
- **Authentication & Security:**
  - Better Auth integration (`send-verification-otp`, `sign-in/email-otp`, `get-session`, `sign-out`).
  - Authoritative user profile verification (`GET /api/v1/users/me`).
  - Active agency resolution and multi-agency tenancy management (`GET /api/v1/agencies/me/owned`).
  - `AuthGuard` preventing unauthenticated access, blocking `USER` and `DRIVER_CONDUCTOR` roles, and eliminating auth flicker.
- **Design System & Components:**
  - Reusable UI kit: `Button`, `Card`, `Badge`, `Input`, `Dialog`, `Table`, `Skeleton`, `Alert`, `Toast`.
  - Responsive `Sidebar` with mobile drawer and active agency switcher.
  - `TopNav` with verified fleet badge and context details.
- **Pages & Flows:**
  - `/login`: Email OTP sign-in, direct session token authentication, resend OTP cooldown.
  - `/dashboard`: Realtime metrics (Active Drivers, Fleet Vehicles, Active Trips, Pending Drivers), pending review queue.
  - `/dashboard/drivers`: Status tabs (All, Pending, Approved, Rejected), server pagination, responsive cards on mobile.
  - `/dashboard/drivers/[id]`: Driver profile audit, KYC vs agency membership status separation, Approve modal (notes), Reject modal (reason), 409 conflict handling.
  - `/dashboard/vehicles`: Vehicle inventory, Add Vehicle modal (bus, minibus, van), activation/deactivation toggles.
  - `/dashboard/vehicles/[id]`: Vehicle specs, current driver assignment, assignment history.
  - `/dashboard/assignments`: Authoritative driver-vehicle pairings, Assign Driver modal, unassign action.
  - `/dashboard/trips`: Fleet trips list, Dispatch Trip modal, Cancel Trip action.
  - `/dashboard/operations`: REST-refreshed operational telemetry (30s cycle), Phase 07 readiness checklist.
  - `/dashboard/settings`: Agency profile update form, multi-agency registration.
  - `/unauthorized`: 403 Forbidden page with mobile app guidance.
- **Documentation:**
  - `ISHAARA_FRONTEND_PHASE_A17_FORENSIC_AUDIT.md`
  - `ISHAARA_FRONTEND_PHASE_A17_API_CONTRACT.md`
  - `ISHAARA_FRONTEND_PHASE_A17_AGENCY_DASHBOARD.md`
  - `ISHAARA_PHASE_17_MANUAL_TEST_PLAN.md`
