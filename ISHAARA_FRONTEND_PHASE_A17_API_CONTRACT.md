# ISHAARA FRONTEND PHASE A17 — AUTHORITATIVE API CONTRACT

**Platform Backend:** `https://reposnse-ishaara.onrender.com`  
**API Prefix:** `/api/v1`  
**Better Auth Prefix:** `/api/auth`  
**Authentication Header:** `Authorization: Bearer <session_token>`  
**Money Units:** Integer Minor Units (Paise, INR ₹1.00 = 100 paise)  
**Standard Envelope:**  
- Success: `{ "success": true, "data": T }`
- Error: `{ "success": false, "error": { "code": string, "message": string, "details"?: any } }`

---

## 1. AUTHENTICATION & SESSION CONTRACTS

### 1.1 Better Auth Liveness
- **Method:** `GET`
- **Route:** `/api/auth/ok`
- **Auth:** Public
- **Response:** `{"ok": true}`

### 1.2 Send Email Verification OTP
- **Method:** `POST`
- **Route:** `/api/auth/email-otp/send-verification-otp`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "owner@agency.isahara.app",
    "type": "sign-in"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully"
  }
  ```

### 1.3 Sign-In with Email OTP
- **Method:** `POST`
- **Route:** `/api/auth/sign-in/email-otp`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "owner@agency.isahara.app",
    "otp": "123456"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "6abbc...",
      "email": "owner@agency.isahara.app",
      "name": "Agency Owner",
      "role": "AGENCY_OWNER"
    },
    "token": "sess_..."
  }
  ```
- **Errors:** `400 Bad Request` (`{"message": "Invalid OTP", "code": "INVALID_OTP"}`)

### 1.4 Get Auth Session
- **Method:** `GET`
- **Route:** `/api/auth/get-session`
- **Auth:** `Bearer <token>` or Cookie
- **Response `200 OK`:**
  ```json
  {
    "session": {
      "id": "sess_...",
      "userId": "6abbc...",
      "expiresAt": "2026-10-09T00:00:00.000Z"
    },
    "user": {
      "id": "6abbc...",
      "email": "owner@agency.isahara.app",
      "name": "Agency Owner",
      "role": "AGENCY_OWNER"
    }
  }
  ```

### 1.5 Sign Out
- **Method:** `POST`
- **Route:** `/api/auth/sign-out`
- **Auth:** `Bearer <token>`
- **Response `200 OK`:** `{"success": true}`

---

## 2. USER & PROFILE CONTRACTS

### 2.1 Get Current User Profile
- **Method:** `GET`
- **Route:** `/api/v1/users/me`
- **Auth:** `requireAuth`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "6abbc...",
      "email": "owner@agency.isahara.app",
      "name": "Agency Owner",
      "role": "AGENCY_OWNER",
      "isOnboarded": true,
      "phoneNumber": "+919876543210",
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  }
  ```

---

## 3. AGENCY MANAGEMENT CONTRACTS

### 3.1 List Owned Agencies
- **Method:** `GET`
- **Route:** `/api/v1/agencies/me/owned`
- **Auth:** `requireAuth`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "6abbc83dbe0dcde3d9cb889f",
        "name": "Pune Metro Transit Agency",
        "businessName": "PMTA Services Pvt Ltd",
        "city": "Pune",
        "state": "Maharashtra",
        "contactPhoneMasked": "******1111",
        "contactEmail": "contact@pmta.in",
        "status": "ACTIVE",
        "createdAt": "2026-09-29T14:16:29.804Z"
      }
    ]
  }
  ```

### 3.2 Get Agency Management View
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/manage`
- **Auth:** `requireOwnerOrAdmin`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "agency": {
        "id": "6abbc83dbe0dcde3d9cb889f",
        "name": "Pune Metro Transit Agency",
        "city": "Pune",
        "status": "ACTIVE"
      },
      "stats": {
        "totalDrivers": 14,
        "activeDrivers": 8,
        "pendingMemberships": 3,
        "totalVehicles": 12,
        "activeVehicles": 9,
        "activeTrips": 4
      }
    }
  }
  ```

### 3.3 Register New Agency
- **Method:** `POST`
- **Route:** `/api/v1/agencies`
- **Auth:** `requireAuth`
- **Request Body:**
  ```json
  {
    "name": "Pune North Shuttle Services",
    "contactEmail": "north@shuttle.in",
    "contactPhone": "+919876543210",
    "city": "Pune"
  }
  ```
- **Response `201 Created`:** Created Agency object with caller as `ownerUserId`.

### 3.4 Update Agency Details
- **Method:** `PATCH`
- **Route:** `/api/v1/agencies/:id`
- **Auth:** `requireOwnerOrAdmin`
- **Request Body:**
  ```json
  {
    "contactPhone": "+919876543211",
    "contactEmail": "support@pmta.in",
    "businessName": "Pune Metro Transit Agency LLP"
  }
  ```
- **Response `200 OK`:** Updated Agency object.

---

## 4. AGENCY MEMBERSHIP (DRIVER FLEET) CONTRACTS

### 4.1 List Agency Memberships
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/memberships`
- **Auth:** `requireOwnerOrAdmin`
- **Query Params:**
  - `status`: `"PENDING"` | `"APPROVED"` | `"REJECTED"` (optional filter)
  - `page`: integer (default 1)
  - `limit`: integer (default 20, max 50)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "mem_6abc...",
          "agencyId": "6abbc83dbe0dcde3d9cb889f",
          "driverId": "drv_6def...",
          "status": "PENDING",
          "notes": "Eager to operate campus north route",
          "createdAt": "2026-10-01T08:30:00.000Z",
          "driver": {
            "id": "drv_6def...",
            "userId": "usr_6xyz...",
            "name": "Ramesh Kumar",
            "email": "ramesh@example.com",
            "yearsOfExperience": 5,
            "operatingType": "AGENCY",
            "status": "OFFLINE",
            "verificationStatus": "PENDING",
            "licenseNumber": "MH12****3456"
          }
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 20,
        "totalPages": 1
      }
    }
  }
  ```

### 4.2 Get Single Membership Detail
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/memberships/:membershipId`
- **Auth:** `requireOwnerOrAdmin`
- **Response `200 OK`:** Full membership object with driver profile and status history.

### 4.3 Approve Driver Membership
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/memberships/:membershipId/approve`
- **Auth:** `requireOwnerOrAdmin`
- **Request Body (Strict):**
  ```json
  {
    "notes": "Approved for north fleet rotation"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "mem_6abc...",
      "status": "ACTIVE",
      "respondedAt": "2026-10-02T10:00:00.000Z",
      "notes": "Approved for north fleet rotation"
    }
  }
  ```
- **Error `409 Conflict`:**
  ```json
  {
    "success": false,
    "error": {
      "code": "MEMBERSHIP_ALREADY_PROCESSED",
      "message": "This membership application has already been processed."
    }
  }
  ```

### 4.4 Reject Driver Membership
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/memberships/:membershipId/reject`
- **Auth:** `requireOwnerOrAdmin`
- **Request Body (Strict):**
  ```json
  {
    "reason": "Driver background documentation incomplete"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "mem_6abc...",
      "status": "REJECTED",
      "respondedAt": "2026-10-02T10:00:00.000Z",
      "rejectionReason": "Driver background documentation incomplete"
    }
  }
  ```
- **Error `409 Conflict`:** Handled same as 4.3.

---

## 5. FLEET VEHICLES CONTRACTS

### 5.1 List Fleet Vehicles
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/vehicles`
- **Auth:** `requireOwnerOrAdmin`
- **Query Params:** `page`, `limit`, `status` (`ACTIVE` | `INACTIVE`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "veh_6abc...",
          "agencyId": "6abbc83dbe0dcde3d9cb889f",
          "registrationNumber": "MH12AB1234",
          "model": "Tata Starbus Ultra",
          "type": "BUS",
          "capacity": 32,
          "ownershipType": "AGENCY",
          "isActive": true,
          "verificationStatus": "VERIFIED",
          "currentAssignment": {
            "assignmentId": "asg_7xyz...",
            "driverId": "drv_6def...",
            "driverName": "Suresh Patel",
            "assignedAt": "2026-09-28T06:00:00.000Z"
          },
          "createdAt": "2026-09-20T10:00:00.000Z"
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 20,
        "totalPages": 1
      }
    }
  }
  ```

### 5.2 Register Fleet Vehicle
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/vehicles`
- **Auth:** `requireOwnerOrAdmin`
- **Request Body:**
  ```json
  {
    "registrationNumber": "MH12CD5678",
    "model": "Ashok Leyland Oyster",
    "type": "BUS",
    "capacity": 28
  }
  ```
- **Response `201 Created`:** Created vehicle document.

### 5.3 Get Fleet Vehicle by ID
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/vehicles/:vehicleId`
- **Auth:** `requireOwnerOrAdmin`

### 5.4 Update Fleet Vehicle
- **Method:** `PATCH`
- **Route:** `/api/v1/agencies/:id/vehicles/:vehicleId`
- **Auth:** `requireOwnerOrAdmin`

### 5.5 Activate / Deactivate Vehicle
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/vehicles/:vehicleId/activate`
- **Route:** `/api/v1/agencies/:id/vehicles/:vehicleId/deactivate`
- **Auth:** `requireOwnerOrAdmin`

---

## 6. VEHICLE ASSIGNMENTS CONTRACTS

### 6.1 Assign Driver to Vehicle
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/vehicles/:vehicleId/assignments`
- **Auth:** `requireOwnerOrAdmin`
- **Request Body:**
  ```json
  {
    "driverId": "drv_6def..."
  }
  ```
- **Response `201 Created` / `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "asg_7xyz...",
      "agencyId": "6abbc83dbe0dcde3d9cb889f",
      "vehicleId": "veh_6abc...",
      "driverId": "drv_6def...",
      "status": "ACTIVE",
      "assignedAt": "2026-10-02T10:15:00.000Z"
    }
  }
  ```
- **Errors:** `409 Conflict` (`DRIVER_ALREADY_ASSIGNED` or `VEHICLE_ALREADY_ASSIGNED`).

### 6.2 Unassign Driver from Vehicle
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/vehicles/:vehicleId/unassign`
- **Auth:** `requireOwnerOrAdmin`
- **Response `200 OK`:** Assignment marked terminated with `unassignedAt`.

### 6.3 Vehicle Assignment History
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/vehicles/:vehicleId/assignments`
- **Auth:** `requireOwnerOrAdmin`
- **Response `200 OK`:** Array of historical and active assignments.

---

## 7. FLEET TRIPS CONTRACTS

### 7.1 List Agency Trips
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/trips`
- **Auth:** `requireOwnerOrAdmin`
- **Query Params:** `page`, `limit`, `status` (`CREATED` | `ACTIVE` | `COMPLETED` | `CANCELLED`)
- **Response `200 OK`:** Paginated trips operated under the agency's fleet.

### 7.2 Get Agency Trip Details
- **Method:** `GET`
- **Route:** `/api/v1/agencies/:id/trips/:tripId`
- **Auth:** `requireOwnerOrAdmin`

### 7.3 Dispatch / Create Agency Trip
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/trips`
- **Auth:** `requireOwnerOrAdmin`
- **Request Body:**
  ```json
  {
    "origin": {
      "name": "Hostel Campus Gate 1",
      "coordinates": [73.8567, 18.5204]
    },
    "destination": {
      "name": "City Tech Center",
      "coordinates": [73.8700, 18.5300]
    },
    "scheduledStartTime": "2026-10-02T14:00:00.000Z",
    "vehicleId": "veh_6abc...",
    "driverId": "drv_6def..."
  }
  ```
- **Response `201 Created`:** Created Trip object.

### 7.4 Cancel Agency Trip
- **Method:** `POST`
- **Route:** `/api/v1/agencies/:id/trips/:tripId/cancel`
- **Auth:** `requireOwnerOrAdmin`
- **Request Body:**
  ```json
  {
    "reason": "Route closed due to road maintenance"
  }
  ```
- **Response `200 OK`:** Trip status transitioned to `CANCELLED`.
