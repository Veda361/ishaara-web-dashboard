# ISHAARA FRONTEND PHASE A18 — SETTLEMENT & RECONCILIATION API CONTRACT

**Platform Backend:** `https://reposnse-ishaara.onrender.com`  
**API Prefix:** `/api/v1`  
**Authentication:** `Authorization: Bearer <session_token>`  
**Admin Secret Header:** `x-admin-key: <ADMIN_SECRET_KEY>` (Administrative operations only)  
**Currency Standard:** INR  
**Money Units:** Integer Minor Units (Paise, ₹1.00 = 100 paise)  

---

## 1. SETTLEMENT LIST CONTRACT

### 1.1 List Operator Settlements
- **Method:** `GET`
- **Route:** `/api/v1/operators/:id/settlements`
- **Auth:** `requireAuth` (Admin or authorized Operator contact)
- **Query Params:**
  - `page`: integer (default: 1)
  - `limit`: integer (default: 20, max: 50)
  - `status`: `"NOT_READY"` | `"PENDING"` | `"PROCESSING"` | `"PROCESSED"` | `"RECONCILING"` | `"FAILED"` (optional)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "set_6abc...",
          "paymentId": "pay_6def...",
          "driverId": "drv_6ghi...",
          "operatorId": "6abbc...",
          "amountMinor": 4050,
          "currency": "INR",
          "status": "PROCESSED",
          "provider": "RAZORPAY",
          "providerTransferId": "trf_mock_abc123",
          "reconciliationStatus": "MATCHED",
          "createdAt": "2026-09-30T10:15:00.000Z",
          "processedAt": "2026-09-30T11:00:00.000Z",
          "updatedAt": "2026-09-30T11:00:00.000Z"
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

---

## 2. SETTLEMENT FINANCIAL SUMMARY CONTRACT

### 2.1 Get Operator Settlement Financial Summary
- **Method:** `GET`
- **Route:** `/api/v1/operators/:id/settlements/summary`
- **Auth:** `requireAuth` (Admin or matching Operator contact)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "operatorId": "6abbc...",
      "totalSettledMinor": 450000,
      "pendingSettledMinor": 18000,
      "failedSettledMinor": 0,
      "currency": "INR",
      "settledCount": 50,
      "pendingCount": 2,
      "failedCount": 0
    }
  }
  ```

---

## 3. SETTLEMENT DETAIL CONTRACT

### 3.1 Get Settlement Details by ID
- **Method:** `GET`
- **Route:** `/api/v1/payments/settlements/:settlementId`
- **Auth:** `requireAuth` + `requireAdminKey`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "set_6abc...",
      "paymentId": "pay_6def...",
      "driverId": "drv_6ghi...",
      "operatorId": "6abbc...",
      "amountMinor": 4050,
      "currency": "INR",
      "status": "PROCESSED",
      "provider": "RAZORPAY",
      "providerTransferId": "trf_mock_abc123",
      "payoutAccountMasked": {
        "accountHolderName": "City Express Transit Pvt Ltd",
        "bankAccountNumber": "****1234",
        "ifsc": "HDFC0001234"
      },
      "reconciliationStatus": "MATCHED",
      "createdAt": "2026-09-30T10:15:00.000Z",
      "processedAt": "2026-09-30T11:00:00.000Z",
      "leaseExpiresAt": null
    }
  }
  ```

---

## 4. FINANCIAL RECONCILIATION AUDIT CONTRACT

### 4.1 Settlement 7-Point Integrity Audit
- **Method:** `GET`
- **Route:** `/api/v1/payments/settlements/reconciliation/audit`
- **Auth:** `requireAuth` + `requireAdminKey`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "checkedCount": 52,
      "discrepanciesCount": 0,
      "discrepancies": []
    }
  }
  ```

---

## 5. ADMINISTRATIVE MUTATION CONTRACTS (A19 BOUNDARY — READ-ONLY IN A18)

| Route | Method | Auth | Body | Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/payments/settlements/:id/process` | `POST` | `x-admin-key` | `{}` | Acquires atomic lease, issues Razorpay Route transfer |
| `/api/v1/payments/settlements/:id/retry` | `POST` | `x-admin-key` | `{ "reason": string }` | Retries failed settlement |
| `/api/v1/payments/settlements/:id/reconcile` | `POST` | `x-admin-key` | `{}` | Reclaims provider status and repairs state |
| `/api/v1/payments/settlements/batch/process` | `POST` | `x-admin-key` | `{}` | Batch processor for all pending settlements |
