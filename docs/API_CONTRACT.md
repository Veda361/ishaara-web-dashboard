# ISHAARA Web Dashboard — Frontend ↔ Backend API Contract

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Backend API Base

| Environment | URL                                          |
|-------------|----------------------------------------------|
| Production  | `https://reposnse-ishaara.onrender.com`      |
| Variable    | `NEXT_PUBLIC_API_BASE_URL`                   |

---

## 2. Authentication Endpoints

### 2.1 Get Current User

```
GET /api/v1/users/me
Authorization: Bearer <session-token>

Response 200:
{
  "data": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "USER" | "DRIVER_CONDUCTOR" | "AGENCY_OWNER" | "ADMIN",
    "isOnboarded": boolean,
    "phoneNumber": "string?",
    "image": "string?",
    "createdAt": "ISO8601"
  }
}

Response 401: Token expired/invalid
```

**Used by:** `AuthContext.restoreSession()`, `verifyAdminSession()`

### 2.2 Sign Out

```
POST /api/auth/sign-out
Authorization: Bearer <session-token>

Response: 200 (session invalidated)
```

### 2.3 OTP Send (BROKEN — BACKEND-AUTH-CORS-001)

```
POST /api/auth/email-otp/send-verification-otp
Content-Type: application/json

Body: { "email": "string" }

CURRENT STATUS: Returns HTTP 500 on CORS preflight
```

---

## 3. Agency Endpoints

### 3.1 Get My Owned Agencies

```
GET /api/v1/agencies/manage
Authorization: Bearer <session-token>

Response 200:
{
  "data": [
    {
      "agency": {
        "id": "string",
        "name": "string",
        "businessName": "string?",
        "city": "string?",
        "state": "string?",
        "contactEmail": "string",
        "status": "ACTIVE" | "SUSPENDED" | "PENDING",
        "ownerUserId": "string",
        "createdAt": "ISO8601"
      },
      "stats": {
        "totalDrivers": number,
        "activeDrivers": number,
        "pendingMemberships": number,
        "totalVehicles": number,
        "activeVehicles": number,
        "activeTrips": number
      }
    }
  ]
}
```

**Used by:** `agenciesApi.getMyOwnedAgencies()`

---

## 4. Membership Endpoints

### 4.1 List Agency Memberships

```
GET /api/v1/agencies/{agencyId}/memberships?status={status}&page={n}&limit={n}
Authorization: Bearer <session-token>

Response 200:
{
  "data": {
    "items": [
      {
        "id": "string",
        "agencyId": "string",
        "driverId": "string",
        "status": "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED",
        "notes": "string?",
        "rejectionReason": "string?",
        "createdAt": "ISO8601",
        "respondedAt": "ISO8601?",
        "driver": { DriverInfo }
      }
    ],
    "pagination": { "total": number, "page": number, "limit": number, "totalPages": number }
  }
}
```

### 4.2 Approve / Reject Membership

```
PATCH /api/v1/agencies/{agencyId}/memberships/{membershipId}/approve
PATCH /api/v1/agencies/{agencyId}/memberships/{membershipId}/reject
Authorization: Bearer <session-token>
Content-Type: application/json

Body (reject only): { "rejectionReason": "string" }

Response 200: { "data": { ...membership } }
Response 409: { "error": { "code": "MEMBERSHIP_ALREADY_PROCESSED" } }
```

---

## 5. Vehicle Endpoints

### 5.1 List Agency Vehicles

```
GET /api/v1/agencies/{agencyId}/vehicles?page={n}&limit={n}
Authorization: Bearer <session-token>

Response 200:
{
  "data": {
    "items": [
      {
        "id": "string",
        "agencyId": "string",
        "registrationNumber": "string",
        "model": "string",
        "type": "BUS" | "MINIBUS" | "VAN" | "AUTO",
        "capacity": number,
        "ownershipType": "AGENCY" | "DRIVER",
        "isActive": boolean,
        "verificationStatus": "PENDING" | "VERIFIED" | "REJECTED",
        "currentAssignment": { "assignmentId": "string", "driverId": "string", "driverName": "string?", "assignedAt": "ISO8601" } | null,
        "createdAt": "ISO8601"
      }
    ],
    "pagination": { ... }
  }
}
```

### 5.2 Assign / Unassign Vehicle

```
POST /api/v1/agencies/{agencyId}/vehicles/{vehicleId}/assign
Authorization: Bearer <session-token>
Content-Type: application/json

Body: { "driverId": "string" }

Response 200: { "data": { ...assignment } }
Response 409: { "error": { "code": "DRIVER_ALREADY_ASSIGNED" | "VEHICLE_ALREADY_ASSIGNED" } }

DELETE /api/v1/agencies/{agencyId}/vehicles/{vehicleId}/assign/{assignmentId}
Response 200 | 204
```

---

## 6. Trip Endpoints

### 6.1 List Agency Trips

```
GET /api/v1/agencies/{agencyId}/trips?status={status}&page={n}&limit={n}
Authorization: Bearer <session-token>

Response 200:
{
  "data": {
    "items": [
      {
        "id": "string",
        "agencyId": "string",
        "vehicleId": "string",
        "driverId": "string",
        "origin": { "name": "string", "coordinates": [number, number] },
        "destination": { "name": "string", "coordinates": [number, number] },
        "scheduledStartTime": "ISO8601",
        "status": "CREATED" | "ACTIVE" | "COMPLETED" | "CANCELLED",
        "vehicle": { Vehicle },
        "driver": { DriverInfo },
        "createdAt": "ISO8601"
      }
    ],
    "pagination": { ... }
  }
}
```

---

## 7. Settlement Endpoints (Agency Owner)

### 7.1 List Operator Settlements

```
GET /api/v1/operators/{operatorId}/settlements?status={status}&page={n}&limit={n}
Authorization: Bearer <session-token>

Response 200:
{
  "data": {
    "items": [
      {
        "id": "string",
        "paymentId": "string",
        "driverId": "string",
        "operatorId": "string",
        "amountMinor": number,       // Integer paise/cents
        "currency": "string",
        "status": "NOT_READY" | "PENDING" | "PROCESSING" | "PROCESSED" | "RECONCILING" | "FAILED",
        "provider": "string?",
        "providerTransferId": "string?",
        "payoutAccountMasked": {
          "accountHolderName": "string?",
          "bankAccountNumber": "string",    // Masked
          "ifsc": "string",
          "razorpayAccountId": "string?"
        },
        "reconciliationStatus": "MATCHED" | "DISCREPANCY" | "PENDING_AUDIT",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601?",
        "processedAt": "ISO8601?",
        "failedReason": "string?"
      }
    ],
    "pagination": { ... }
  }
}
```

### 7.2 Operator Settlement Summary

```
GET /api/v1/operators/{operatorId}/settlements/summary
Authorization: Bearer <session-token>

Response 200:
{
  "data": {
    "operatorId": "string",
    "totalSettledMinor": number,
    "pendingSettledMinor": number,
    "failedSettledMinor": number,
    "currency": "string",
    "settledCount": number,
    "pendingCount": number,
    "failedCount": number
  }
}
```

---

## 8. Settlement Endpoints (Admin — Proxied)

All admin endpoints go through Next.js server-side proxy:
- Browser → `/api/admin/settlements/*` → `adminProxy.ts` → Backend `/api/v1/payments/settlements/*`
- `x-admin-key` injected server-side

### 8.1 List Platform Settlements

```
GET /api/admin/settlements?status={status}&page={n}&limit={n}&operatorId={id}&driverId={id}&startDate={date}&endDate={date}
Authorization: Bearer <admin-token>

Proxied to: GET /api/v1/payments/settlements
Response: Same shape as 7.1
```

### 8.2 Get Settlement Detail

```
GET /api/admin/settlements/{settlementId}
Authorization: Bearer <admin-token>

Proxied to: GET /api/v1/payments/settlements/{id}
Response 200: { "data": { ...SettlementRecord } }
```

### 8.3 Process Settlement

```
POST /api/admin/settlements/{settlementId}/process
Authorization: Bearer <admin-token>
Content-Type: application/json
Body: {}

Proxied to: POST /api/v1/payments/settlements/{id}/process
Response 200: { "data": { ...SettlementRecord } }
Response 409: { "error": { "code": "LEASE_CONFLICT" | "SETTLEMENT_ALREADY_PROCESSING" } }
```

### 8.4 Retry Failed Settlement

```
POST /api/admin/settlements/{settlementId}/retry
Authorization: Bearer <admin-token>
Content-Type: application/json
Body: { "reason": "string (≥ 3 chars)" }

Proxied to: POST /api/v1/payments/settlements/{id}/retry
Response 200: { "data": { ...SettlementRecord } }
```

### 8.5 Reconcile Settlement

```
POST /api/admin/settlements/{settlementId}/reconcile
Authorization: Bearer <admin-token>
Content-Type: application/json
Body: {}

Proxied to: POST /api/v1/payments/settlements/{id}/reconcile
Response 200: { "data": { ...SettlementRecord } }
```

### 8.6 Batch Process Settlements

```
POST /api/admin/settlements/batch/process
Authorization: Bearer <admin-token>
Content-Type: application/json
Body: {}

Proxied to: POST /api/v1/payments/settlements/batch/process
Response 200:
{
  "data": {
    "processed": number,
    "succeeded": number,
    "failed": number,
    "results": [
      { "settlementId": "string", "status": "string", "error": "string?" }
    ]
  }
}
```

### 8.7 Reconciliation Audit

```
GET /api/admin/settlements/reconciliation/audit
Authorization: Bearer <admin-token>

Proxied to: GET /api/v1/payments/settlements/reconciliation/audit
Response 200:
{
  "data": {
    "checkedCount": number,
    "discrepanciesCount": number,
    "discrepancies": [
      {
        "settlementId": "string",
        "type": "string",
        "details": "string",
        "severity": "HIGH" | "MEDIUM" | "LOW"
      }
    ]
  }
}
```

### 8.8 Reconciliation Sweep

```
POST /api/admin/settlements/reconciliation/sweep
Authorization: Bearer <admin-token>
Content-Type: application/json
Body: {}

Proxied to: POST /api/v1/payments/settlements/reconciliation/sweep
Response 200:
{
  "data": {
    "staleLeasesReleased": number?,
    "transfersSynchronized": number?
  }
}
```

---

## 9. Standard Response Envelope

### 9.1 Success

```json
{
  "success": true,
  "data": { ... },
  "message": "string?"
}
```

### 9.2 Error

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "any?",
    "requestId": "string?"
  }
}
```

---

## 10. Standard Headers

### 10.1 Request Headers

| Header          | Required | Value                        |
|-----------------|----------|------------------------------|
| `Authorization` | Yes*     | `Bearer <session-token>`     |
| `Content-Type`  | Yes**    | `application/json`           |
| `X-Request-ID`  | No       | Correlation ID (propagated)  |

\* Not required for `/api/health`
\** Not required for GET requests

### 10.2 Response Headers

| Header           | Value                        | Source          |
|------------------|------------------------------|-----------------|
| `X-Request-ID`   | Request correlation ID       | Admin proxy     |
| `Cache-Control`  | `no-store, no-cache, ...`    | Health endpoint |
