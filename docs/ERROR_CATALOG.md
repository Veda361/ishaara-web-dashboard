# ISHAARA Web Dashboard — Error Catalog

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Server-Side Error Codes (API Routes)

### 1.1 Authentication & Authorization Errors

| Code                        | HTTP Status | Source                  | Description                                      | User Message                                              |
|-----------------------------|-------------|-------------------------|--------------------------------------------------|-----------------------------------------------------------|
| `UNAUTHORIZED`              | 401         | `adminProxy.ts`         | Missing or empty Authorization header            | "Authentication required. Admin session token missing."   |
| `UNAUTHORIZED`              | 401         | `adminProxy.ts`         | Token rejected by backend (session expired)      | "Authentication session expired or invalid."              |
| `FORBIDDEN`                 | 403         | `adminProxy.ts`         | User role is not ADMIN                           | "Administrative role required. Access denied."            |
| `AUTH_VERIFICATION_FAILED`  | 403         | `adminProxy.ts`         | Backend auth check returned non-200/non-401      | "Failed to verify administrative authorization."          |
| `AUTH_SERVICE_UNAVAILABLE`  | 502         | `adminProxy.ts`         | Backend unreachable for auth verification (6s timeout) | "Authentication verification service unavailable."   |

### 1.2 Input Validation Errors

| Code                        | HTTP Status | Source                  | Description                                      | User Message                                              |
|-----------------------------|-------------|-------------------------|--------------------------------------------------|-----------------------------------------------------------|
| `INVALID_SETTLEMENT_ID`     | 400         | `[settlementId]/*.ts`   | Settlement ID fails `/^[a-zA-Z0-9_-]{3,64}$/`   | "Invalid or malformed settlement ID."                     |
| `INVALID_REQUEST_BODY`      | 400         | `retry/route.ts`        | Request body is not valid JSON                   | "Request body must be valid JSON containing a non-empty 'reason'." |
| `MISSING_RETRY_REASON`      | 400         | `retry/route.ts`        | Missing or invalid `reason` field                | "A valid administrative reason is required."              |
| `INVALID_REASON_LENGTH`     | 400         | `retry/route.ts`        | Reason string < 3 characters                    | "Administrative retry reason must be at least 3 characters." |

### 1.3 Infrastructure Errors

| Code                        | HTTP Status | Source                  | Description                                      | User Message                                              |
|-----------------------------|-------------|-------------------------|--------------------------------------------------|-----------------------------------------------------------|
| `ADMIN_KEY_NOT_CONFIGURED`  | 503         | `adminProxy.ts`         | `ADMIN_SECRET_KEY` env var not set               | "Administrative secret key is not configured."            |
| `UPSTREAM_TIMEOUT`          | 504         | `adminProxy.ts`         | Backend did not respond within 15,000ms          | "Request to financial settlement gateway timed out."      |
| `GATEWAY_ERROR`             | 502         | `adminProxy.ts`         | Network error communicating with backend         | "Failed to communicate with financial settlement backend." |
| `BACKEND_DEGRADED`          | —           | `health/route.ts`       | Backend returned unexpected status (not 200/401/403) | Logged internally, health status: `degraded`          |

---

## 2. Client-Side Error Codes

### 2.1 API Client Errors

| Code               | HTTP Status | Source             | Description                                      | User Message                                     |
|--------------------|-------------|--------------------|--------------------------------------------------|--------------------------------------------------|
| `TIMEOUT`          | 408         | `client.ts`        | Request aborted after 15,000ms                   | "Request timed out. Please try again."           |
| `NETWORK_ERROR`    | 0           | `client.ts`        | Fetch failed (no network / DNS failure)          | "Network failure."                               |
| `HTTP_{status}`    | Varies      | `client.ts`        | Non-200 response with no structured error code   | Status text or "Request failed."                 |

### 2.2 Business Logic Error Codes (from Backend)

| Code                             | HTTP Status | Domain               | User-Facing Message                                         |
|----------------------------------|-------------|----------------------|-------------------------------------------------------------|
| `LEASE_CONFLICT`                 | 409         | Settlements          | "This settlement is already being processed."               |
| `SETTLEMENT_ALREADY_PROCESSING`  | 409         | Settlements          | "This settlement is already being processed."               |
| `MEMBERSHIP_ALREADY_PROCESSED`   | 409         | Memberships          | "This membership has already been processed."               |
| `DRIVER_ALREADY_ASSIGNED`        | 409         | Assignments          | "This driver is already actively assigned to another vehicle." |
| `VEHICLE_ALREADY_ASSIGNED`       | 409         | Assignments          | "This vehicle is already actively assigned to another driver." |

---

## 3. HTTP Status Code Mapping

### 3.1 Standard Responses

| Status | Category       | Default User Message                                               |
|--------|----------------|--------------------------------------------------------------------|
| 200    | Success        | (data returned)                                                    |
| 204    | Success        | (empty response, treated as `{}`)                                  |
| 400    | Client Error   | Specific validation message                                       |
| 401    | Unauthorized   | "Session expired or authentication required. Please sign in."      |
| 403    | Forbidden      | "You do not have permission to perform this action."               |
| 404    | Not Found      | "The requested resource could not be found."                       |
| 409    | Conflict       | Context-specific (see 2.2)                                        |
| 429    | Rate Limit     | "Too many requests. Please wait before retrying."                  |
| 502    | Gateway Error  | "Financial settlement gateway is currently unavailable."           |
| 503    | Unavailable    | "Administrative service is currently unavailable."                 |
| 504    | Timeout        | "Financial settlement gateway timed out."                          |
| 5xx    | Server Error   | "Something went wrong on the server. Please try again later."      |

---

## 4. Error Handling Flow

```
Backend Response (non-2xx)
    │
    ▼
apiClient.request() → throws ApiError(status, code, message, details)
    │
    ▼
Component catch block → formatApiErrorMessage(error) → sanitizeMessage()
    │
    ▼
User sees safe, non-technical error message
    │
    ▼
If 401 → auto-redirect to /login (token cleared)
```

### 4.1 Sanitization Pipeline

```
Raw error.message
    │
    ▼
sanitizeMessage() checks against 14 sensitive patterns
    │
    ├── Match found → "A technical error occurred while communicating with the service."
    │
    └── No match → Original message passed through
```

---

## 5. Known External Issues

| Issue ID              | Error Symptom                               | Root Cause                           | Status |
|-----------------------|---------------------------------------------|--------------------------------------|--------|
| `BACKEND-AUTH-CORS-001` | HTTP 500 on OTP endpoint preflight        | Better Auth CORS misconfiguration    | OPEN   |
