# ISHAARA — Vehicle Assignment DRIVER_VERIFIED Flow Fix

**Project:** ISHAARA Web Dashboard  
**Status:** ✅ COMPLETED  
**Date:** October 3, 2026  

---

## 1. Root Cause

In the vehicle assignment modal at `/dashboard/assignments`, the driver selection dropdown previously retrieved agency memberships with `status: "APPROVED"` via `membershipsApi.listMemberships(agencyId, { status: "APPROVED", limit: 50 })`, but failed to inspect or enforce the platform KYC verification status (`driver.verificationStatus === "VERIFIED"`).

The frontend conflated **Agency Fleet Membership** (`APPROVED`) with **Platform Driver Verification** (`VERIFIED`). Consequently, agency operators could select a driver who belonged to the agency fleet but had not yet completed platform KYC verification. Submitting this selection caused the backend to enforce its authoritative business invariant and reject the request with HTTP 400 `DRIVER_NOT_VERIFIED`.

---

## 2. Backend Error Evidence

**Endpoint:**  
`POST /api/v1/agencies/{agencyId}/vehicles/{vehicleId}/assignments`

**Request Payload Sent:**  
```json
{
  "driverId": "6ac09045c639422a5e7ef19f"
}
```

**Backend Response:**  
```json
HTTP 400 Bad Request
{
  "success": false,
  "error": {
    "code": "DRIVER_NOT_VERIFIED",
    "message": "Driver must be platform VERIFIED before vehicle assignment."
  }
}
```

The backend is enforcing the domain invariant: **A driver must possess platform verification (`VERIFIED`) before they can be paired with an active fleet vehicle.**

---

## 3. Current Driver Verification State

Platform KYC verification is managed independently at the platform level:
- `PENDING`: Driver has registered or submitted identity documents, but review is incomplete.
- `VERIFIED`: Platform has audited and approved driver identity, license, and KYC credentials. Operational fleet assignments are permitted.
- `REJECTED`: Driver identity or KYC was denied by platform administration.

---

## 4. Membership State

Agency Fleet Membership represents an affiliation between a driver and a specific agency:
- `PENDING`: Driver applied to join the agency fleet.
- `APPROVED` / `ACTIVE`: Agency fleet manager accepted the driver into the agency roster.
- `REJECTED`: Agency fleet manager declined the driver's affiliation request.

---

## 5. Difference Between Membership and Verification

| Dimension | Agency Fleet Membership | Platform Driver Verification |
|---|---|---|
| **Authoritative Domain** | Tenant / Agency Fleet level | Platform / System-wide KYC level |
| **Controlled By** | Agency Fleet Manager / Owner | Platform Operations & Compliance Team |
| **Status Field** | `AgencyMembership.status` (`PENDING`, `APPROVED`, `ACTIVE`, `REJECTED`) | `AgencyMembership.driver.verificationStatus` (`PENDING`, `VERIFIED`, `REJECTED`) |
| **Operational Meaning** | Indicates the driver is employed by / contracted to this fleet asset owner | Authorizes driver to operate passenger transport assets safely on the platform |
| **Sufficient for Assignment?** | ❌ **No**. Agency approval alone does not permit vehicle operation | ✅ **Required condition** along with active agency membership |

---

## 6. Frontend Changes

1. **Assignment Modal UI & Dropdown ([src/app/dashboard/assignments/page.tsx](file:///home/dev/ishara-web-dashboard/src/app/dashboard/assignments/page.tsx)):**
   - Updated header label to **"Select Verified Driver \*"**.
   - Added descriptive helper text: *"Only platform-verified drivers can be assigned to vehicles."*
   - Driver dropdown partitions candidates into two optgroups:
     - `Platform Verified Drivers (Eligible)`: Selectable options marked with `[VERIFIED]`.
     - `Pending / Unverified Drivers (Ineligible)`: Disabled options marked with `— Platform verification <status>`.
   - Dynamic counter displayed above dropdown: `N verified available`.

2. **Differentiated Empty States:**
   - When agency drivers exist but none are verified: Displays an alert with heading **"No verified drivers available"** and message *"Drivers must complete platform verification before they can be assigned to a vehicle."* along with a direct link to manage drivers.
   - When zero agency drivers exist: Informs operator that no driver applications have been approved yet.

3. **Ineligible Driver Deep-Link (Phase 9):**
   - If an unverified driver is highlighted or inspected, displays a warning banner with a direct link to the driver review page (`/dashboard/drivers/[id]`) so the operator can review KYC progress.

4. **Driver Detail Page Alignment ([src/app/dashboard/drivers/[id]/page.tsx](file:///home/dev/ishara-web-dashboard/src/app/dashboard/drivers/[id]/page.tsx)):**
   - Corrected misleading copy on lines 271 and 449 to make explicit that approving fleet membership admits the driver to the fleet, but platform verification is required before vehicle assignment.

---

## 7. API Changes

No API schema or parameter changes were introduced. The client continues to preserve the exact minimal request contract:
```http
POST /api/v1/agencies/{agencyId}/vehicles/{vehicleId}/assignments
Content-Type: application/json

{
  "driverId": "<verified-driver-id>"
}
```
No superfluous fields (`membershipId`, `status`, `verificationStatus`, `vehicleId`) are sent in the body.

---

## 8. Driver Filtering Logic

```typescript
const verifiedMemberships = approvedMemberships.filter(
  (m) => m.driver?.verificationStatus === "VERIFIED"
);

const unverifiedMemberships = approvedMemberships.filter(
  (m) => m.driver?.verificationStatus !== "VERIFIED"
);
```

---

## 9. Assignment Guard

Before issuing `POST /api/v1/agencies/{agencyId}/vehicles/{vehicleId}/assignments`:
```typescript
const selectedDriverMembership = approvedMemberships.find(
  (m) => (m.driverId || m.id) === selectedDriverId
);
const isSelectedDriverVerified =
  selectedDriverMembership?.driver?.verificationStatus === "VERIFIED";

const handleAssignSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedVehicleId || !selectedDriverId) return;

  // Defensive UX guard
  if (!isSelectedDriverVerified) {
    toast("Driver must be platform VERIFIED before vehicle assignment.", "error");
    return;
  }

  assignMutation.mutate();
};
```
The "Confirm Assignment" button is also disabled if `!isSelectedDriverVerified`.

---

## 10. Error Handling

In [src/lib/errors/index.ts](file:///home/dev/ishara-web-dashboard/src/lib/errors/index.ts), explicit handling was added for the `DRIVER_NOT_VERIFIED` code under HTTP 400:
```typescript
if (error.status === 400) {
  if (error.code === "DRIVER_NOT_VERIFIED") {
    return "Driver must be platform VERIFIED before vehicle assignment.";
  }
  // ...
}
```
This guarantees that if an unverified assignment is attempted, the user receives an actionable, domain-accurate message instead of a generic "Bad Request" or "Request failed".

---

## 11. Network Verification

- **Eligible driver:** `POST /api/v1/agencies/{agencyId}/vehicles/{vehicleId}/assignments` with `{ "driverId": "<id>" }` is dispatched and succeeds.
- **Ineligible driver:** The frontend blocks the network request, preventing invalid calls.
- **Backend authority:** If any client bypasses the frontend guard, the backend independently returns HTTP 400 `DRIVER_NOT_VERIFIED`.

---

## 12. Tests

Ran Vitest with 139 tests across 21 suites passing:
- **CASE 1:** Platform VERIFIED + Membership APPROVED/ACTIVE → Driver eligible / selectable (PASS)
- **CASE 2:** Platform PENDING + Membership APPROVED → Driver not assignable (PASS)
- **CASE 3:** Platform UNDER_REVIEW + Membership APPROVED → Driver not assignable (PASS)
- **CASE 4:** Platform REJECTED + Membership APPROVED → Driver not assignable (PASS)
- **CASE 5:** Platform VERIFIED + Membership PENDING → Driver not assignable (PASS)
- **CASE 6:** Platform VERIFIED + Membership REJECTED → Driver not assignable (PASS)
- **CASE 7:** Empty state differentiation between no verified drivers vs no drivers found (PASS)
- **CASE 8:** Backend returns `DRIVER_NOT_VERIFIED` → Formats clear business rule error (PASS)
- **Minimal payload contract:** Verifies only `driverId` is sent in POST body (PASS)

---

## 13. Build Result

- TypeScript type-check: `npx tsc --noEmit` passed with 0 errors.
- ESLint: 0 errors.
- Production build: `npm run build` compiled successfully in 4.6s with Turbopack (22 static & dynamic routes verified).

---

## 14. Remaining Issues

None. All 18 phases of the vehicle assignment driver verification flow are verified and complete.
