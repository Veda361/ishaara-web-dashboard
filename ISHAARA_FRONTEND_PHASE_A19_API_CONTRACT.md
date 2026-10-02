# ISHAARA FRONTEND PHASE A19 — API CONTRACT
**Phase:** A19 — Admin Operations & Settlement Control Center  
**Base URL:** `https://reposnse-ishaara.onrender.com` (proxied server-side via Next.js `/api/admin/settlements/*`)  
**Specification Reference:** `api_final_flow.md` Sections 25 & 26

---

## 1. Authentication & Header Architecture

### 1.1 Client-to-Proxy Contract
When the browser frontend makes an administrative request, it targets Next.js internal Route Handlers:
- **URL Base:** `/api/admin/settlements`
- **Headers:**
  - `Authorization: Bearer <session_token>` (Client session token from `authStorage`)
  - `Content-Type: application/json`

### 1.2 Proxy-to-Upstream Contract
The Next.js Route Handler validates caller session, verifies `ADMIN` role, and forwards to upstream backend:
- **URL Base:** `https://reposnse-ishaara.onrender.com/api/v1/payments/settlements`
- **Headers:**
  - `Authorization: Bearer <session_token>`
  - `x-admin-key: <ADMIN_SECRET_KEY>` (From server-side `process.env.ADMIN_SECRET_KEY`)
  - `Content-Type: application/json`

---

## 2. Admin Settlement Endpoints Specification

### 2.1 List All Settlements (Admin)
- **Method:** `GET`
- **Route:** `/api/v1/payments/settlements` (Proxied via `/api/admin/settlements`)
- **Query Parameters:**
  - `page` (optional integer, default `1`)
  - `limit` (optional integer, default `20`)
  - `status` (optional: `NOT_READY`, `PENDING`, `PROCESSING`, `PROCESSED`, `RECONCILING`, `FAILED`)
  - `operatorId` (optional string)
  - `driverId` (optional string)
  - `startDate` (optional ISO 8601 string)
  - `endDate` (optional ISO 8601 string)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "set_6abc1234",
          "paymentId": "pay_5def6789",
          "driverId": "drv_8ghi1011",
          "operatorId": "op_9jkl1213",
          "amountMinor": 4050,
          "currency": "INR",
          "status": "PENDING",
          "provider": "RAZORPAY_ROUTE",
          "providerTransferId": null,
          "payoutAccountMasked": {
            "accountHolderName": "City Transit Fleet",
            "bankAccountNumber": "******1234",
            "ifsc": "HDFC0001234"
          },
          "reconciliationStatus": "MATCHED",
          "createdAt": "2026-10-01T10:00:00Z",
          "updatedAt": "2026-10-01T10:00:00Z",
          "processedAt": null,
          "failedReason": null
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
- **Error Responses:**
  - `401 UNAUTHORIZED`: Authentication session missing or expired
  - `403 FORBIDDEN`: Non-admin user or invalid `x-admin-key`
  - `503 SERVICE_UNAVAILABLE`: Upstream service unreachable or administrative secret not configured

---

### 2.2 Get Settlement Details by ID (Admin)
- **Method:** `GET`
- **Route:** `/api/v1/payments/settlements/:settlementId` (Proxied via `/api/admin/settlements/:settlementId`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "set_6abc1234",
      "paymentId": "pay_5def6789",
      "driverId": "drv_8ghi1011",
      "operatorId": "op_9jkl1213",
      "amountMinor": 4050,
      "currency": "INR",
      "status": "FAILED",
      "provider": "RAZORPAY_ROUTE",
      "providerTransferId": null,
      "payoutAccountMasked": {
        "accountHolderName": "City Transit Fleet",
        "bankAccountNumber": "******1234",
        "ifsc": "HDFC0001234",
        "razorpayAccountId": "acc_7mno1415"
      },
      "reconciliationStatus": "DISCREPANCY",
      "createdAt": "2026-10-01T10:00:00Z",
      "updatedAt": "2026-10-01T10:05:00Z",
      "processedAt": null,
      "failedReason": "BENEFICIARY_BANK_OFFLINE"
    }
  }
  ```

---

### 2.3 Process Single Settlement (Admin)
- **Method:** `POST`
- **Route:** `/api/v1/payments/settlements/:settlementId/process` (Proxied via `/api/admin/settlements/:settlementId/process`)
- **Request Body:** `{}` (empty object)
- **Idempotency & Concurrency:** Protected by atomic lease in database. Repeated clicks or concurrent executions return `409 Conflict`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "set_6abc1234",
      "status": "PROCESSED",
      "providerTransferId": "trf_razorpay_99812",
      "processedAt": "2026-10-02T12:00:00Z"
    },
    "message": "Settlement processed successfully"
  }
  ```
- **Error Responses:**
  - `409 CONFLICT`: Settlement already under active processing lease or already processed
  - `422 UNPROCESSABLE_ENTITY`: Operator KYC unverified or bank credentials invalid

---

### 2.4 Retry Failed Settlement (Admin)
- **Method:** `POST`
- **Route:** `/api/v1/payments/settlements/:settlementId/retry` (Proxied via `/api/admin/settlements/:settlementId/retry`)
- **Request Body:**
  ```json
  {
    "reason": "Operator bank account re-verified by financial operations team"
  }
  ```
- **Validation:** `reason` is required and must be non-empty string (min 3 chars).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "set_6abc1234",
      "status": "PENDING",
      "failedReason": null
    },
    "message": "Settlement re-queued for processing"
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST`: Missing or empty `reason` field
  - `409 CONFLICT`: Settlement is not in `FAILED` status

---

### 2.5 Reconcile Settlement (Admin)
- **Method:** `POST`
- **Route:** `/api/v1/payments/settlements/:settlementId/reconcile` (Proxied via `/api/admin/settlements/:settlementId/reconcile`)
- **Request Body:** `{}`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "set_6abc1234",
      "status": "PROCESSED",
      "reconciliationStatus": "MATCHED",
      "providerTransferId": "trf_razorpay_99812"
    },
    "message": "Settlement reconciled with payment gateway"
  }
  ```

---

### 2.6 Batch Process Settlements (Admin)
- **Method:** `POST`
- **Route:** `/api/v1/payments/settlements/batch/process` (Proxied via `/api/admin/settlements/batch/process`)
- **Request Body:** `{}`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "processed": 12,
      "succeeded": 11,
      "failed": 1,
      "results": [
        {
          "settlementId": "set_1",
          "status": "PROCESSED",
          "error": null
        },
        {
          "settlementId": "set_2",
          "status": "FAILED",
          "error": "BANK_REJECTED"
        }
      ]
    },
    "message": "Batch settlement run completed"
  }
  ```

---

### 2.7 7-Point Reconciliation Integrity Audit (Admin)
- **Method:** `GET`
- **Route:** `/api/v1/payments/settlements/reconciliation/audit` (Proxied via `/api/admin/settlements/reconciliation/audit`)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "checkedCount": 150,
      "discrepanciesCount": 2,
      "discrepancies": [
        {
          "settlementId": "set_987",
          "type": "AMOUNT_MISMATCH",
          "details": "Settlement amount ₹40.50 does not match payment provider net ₹40.00",
          "severity": "HIGH"
        },
        {
          "settlementId": "set_654",
          "type": "STALE_PROCESSING_LEASE",
          "details": "Lease held > 15 minutes without status transition",
          "severity": "MEDIUM"
        }
      ]
    }
  }
  ```

---

### 2.8 Automated Reconciliation Sweep (Admin)
- **Method:** `POST`
- **Route:** `/api/v1/payments/settlements/reconciliation/sweep` (Proxied via `/api/admin/settlements/reconciliation/sweep`)
- **Request Body:** `{}`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "staleLeasesReleased": 2,
      "transfersSynchronized": 5
    },
    "message": "Reconciliation sweep completed"
  }
  ```

---

## 3. Financial Invariants & Error Mapping

| HTTP Status | Error Code | Safe User Display Message |
|---|---|---|
| `400` | `INVALID_PAYLOAD` | Invalid request parameters. Please verify input data. |
| `401` | `UNAUTHORIZED` | Your session has expired. Please sign in again. |
| `403` | `FORBIDDEN` | Access denied. Administrative credentials required. |
| `404` | `NOT_FOUND` | Settlement record not found. |
| `409` | `LEASE_CONFLICT` / `ALREADY_PROCESSING` | Operation conflict: This settlement is already being processed or is locked. |
| `422` | `UNPROCESSABLE` | KYC or banking requirements not met for payout execution. |
| `429` | `RATE_LIMITED` | Admin rate limit reached (100 requests / 15 min). Please wait. |
| `500` / `502` / `503` | `UPSTREAM_ERROR` | Financial provider gateway error. No funds deducted. Please re-check later. |
