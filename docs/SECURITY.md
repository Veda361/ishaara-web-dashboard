# ISHAARA Web Dashboard — Security & Authorization Reference

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Authentication Model

### 1.1 Token-Based Session Authentication

The application uses **Better Auth** session tokens issued by the backend API.

| Attribute          | Value                                                      |
|--------------------|------------------------------------------------------------|
| Token Format       | Opaque session token (Better Auth)                         |
| Storage (Primary)  | `localStorage` key: `ishaara_session_token`                |
| Storage (Fallback) | In-memory variable (`inMemoryToken`)                       |
| Transport          | `Authorization: Bearer <token>` header                     |
| Validation         | Backend `GET /api/v1/users/me` returns user + role         |
| Session Restore    | On page load, `AuthContext.restoreSession()` validates token |

### 1.2 Login Flow

```
1. User navigates to /login
2. User enters session token (workaround for BACKEND-AUTH-CORS-001)
3. Client calls GET /api/v1/users/me with Bearer token
4. On 200: AuthContext stores user + fetches owned agencies
5. On 401/403: Token rejected, user stays on /login
6. Redirect to /dashboard (agency owner) or /admin (admin)
```

> **Note:** OTP-based login (`/api/auth/email-otp/send-verification-otp`) is
> non-functional due to `BACKEND-AUTH-CORS-001`. The direct token entry serves
> as the production workaround until the upstream fix is deployed.

### 1.3 Logout Flow

```
1. AuthContext.logout() calls authApi.signOut()
2. Clears localStorage token
3. Clears in-memory token
4. Resets user/agency state to null
5. Page redirects to /login
```

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Role Definitions

| Role                | Scope          | Description                                        |
|---------------------|----------------|----------------------------------------------------|
| `USER`              | Passenger      | End-user / rider. No dashboard access.             |
| `DRIVER_CONDUCTOR`  | Driver         | Fleet driver. No dashboard access.                 |
| `AGENCY_OWNER`      | Agency         | Owns one or more transit agencies.                 |
| `ADMIN`             | Platform       | Full platform admin + financial mutation rights.   |

### 2.2 Access Matrix

| Resource                          | USER | DRIVER_CONDUCTOR | AGENCY_OWNER | ADMIN |
|-----------------------------------|------|-------------------|--------------|-------|
| `/login`                          | ✓    | ✓                 | ✓            | ✓     |
| `/dashboard/*`                    | ✗    | ✗                 | ✓            | ✓     |
| `/admin/*`                        | ✗    | ✗                 | ✗            | ✓     |
| `/api/admin/settlements/*`        | ✗    | ✗                 | ✗            | ✓     |
| `/api/health`                     | ✓    | ✓                 | ✓            | ✓     |
| Backend `/api/v1/operators/*/settlements` | ✗ | ✗           | ✓ (scoped)   | ✓     |

### 2.3 Guard Enforcement Points

#### Client-Side Guards

| Guard                                                                                    | Protected Routes  | Enforcement Logic                               |
|------------------------------------------------------------------------------------------|-------------------|-------------------------------------------------|
| [`AuthGuard`](file:///home/dev/ishara-web-dashboard/src/components/layout/AuthGuard.tsx) | `/dashboard/*`    | `isAuthenticated` AND not `USER`/`DRIVER_CONDUCTOR` AND `ownedAgencies.length > 0` |
| [`AdminGuard`](file:///home/dev/ishara-web-dashboard/src/components/layout/AdminGuard.tsx)| `/admin/*`       | `isAuthenticated` AND `user.role === "ADMIN"`   |

#### Server-Side Guards

| Guard                                                                                                  | Protected Routes           | Enforcement Logic                                |
|--------------------------------------------------------------------------------------------------------|---------------------------|--------------------------------------------------|
| [`verifyAdminSession()`](file:///home/dev/ishara-web-dashboard/src/lib/server/adminProxy.ts#L27-L121) | `/api/admin/settlements/*` | Token → backend `/api/v1/users/me` → role check |
| `proxyAdminRequest()`                                                                                  | `/api/admin/settlements/*` | Auth header required + admin session + admin key |

---

## 3. Admin Secret Management

### 3.1 ADMIN_SECRET_KEY Architecture

```
┌─────────────────────────────────────────────────────┐
│                    ADMIN_SECRET_KEY                  │
│                                                     │
│  Location: Server environment variable (.env.local) │
│  Prefix:   NO NEXT_PUBLIC_ prefix (server-only)     │
│  Access:   process.env.ADMIN_SECRET_KEY             │
│  Usage:    Injected as x-admin-key header           │
│  Exposure: NEVER sent to browser                    │
│  Verified: Phase A20 security audit                 │
└─────────────────────────────────────────────────────┘
```

### 3.2 Security Guarantees

| Guarantee                                        | Enforcement                                  |
|--------------------------------------------------|----------------------------------------------|
| `ADMIN_SECRET_KEY` not in client bundle           | No `NEXT_PUBLIC_` prefix                     |
| `x-admin-key` never sent by browser              | Only injected in server-side `adminProxy.ts` |
| Missing `ADMIN_SECRET_KEY` blocks operations      | Returns HTTP 503 with `ADMIN_KEY_NOT_CONFIGURED` |
| Non-admin roles cannot trigger admin operations   | `verifyAdminSession()` rejects before proxy  |
| Secrets redacted from logs                        | `redactSensitiveData()` in `logger.ts`       |

---

## 4. Input Validation & Injection Prevention

### 4.1 Settlement ID Validation

All settlement ID parameters are validated server-side before upstream forwarding:

```typescript
// src/lib/server/adminProxy.ts
export function isValidSettlementId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[a-zA-Z0-9_-]{3,64}$/.test(id.trim());
}
```

- **Blocks:** Path traversal (`../`), SQL injection, XSS payloads, empty strings
- **Allows:** Alphanumeric + hyphen + underscore, 3–64 chars
- **URI Encoding:** `encodeURIComponent()` on upstream path construction

### 4.2 Retry Reason Validation

```typescript
// src/app/api/admin/settlements/[settlementId]/retry/route.ts
- Body must be valid JSON
- Must contain "reason" key
- "reason" must be a string
- "reason" must be ≥ 3 characters after trim
```

### 4.3 Error Message Sanitization

[`sanitizeMessage()`](file:///home/dev/ishara-web-dashboard/src/lib/errors/index.ts#L15-L43) blocks the following from reaching the UI:

| Pattern Category    | Examples Blocked                                     |
|---------------------|------------------------------------------------------|
| Secrets             | `admin_secret_key`, `x-admin-key`, `password`, `token` |
| Auth headers        | `authorization`, `bearer`, `cookie`                  |
| Internal infra      | `postgres://`, `mysql://`, `econnrefused`            |
| Internal IPs        | `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`         |
| URLs                | `http://`, `https://`                                |
| Stack traces        | `at FunctionName (`                                  |

---

## 5. Security Headers

All responses include the following headers configured in
[`next.config.ts`](file:///home/dev/ishara-web-dashboard/next.config.ts):

| Header                       | Purpose                                        | Value                                    |
|------------------------------|------------------------------------------------|------------------------------------------|
| `X-Content-Type-Options`     | Prevents MIME type sniffing                    | `nosniff`                                |
| `X-Frame-Options`            | Prevents clickjacking                          | `DENY`                                   |
| `Referrer-Policy`            | Controls referrer leakage                      | `strict-origin-when-cross-origin`        |
| `Strict-Transport-Security`  | Enforces HTTPS                                 | `max-age=31536000; includeSubDomains; preload` |
| `Permissions-Policy`         | Restricts browser APIs                         | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy`    | Controls resource loading                      | `default-src 'self'; frame-ancestors 'none'` |

### CSP Policy Detail

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data: https:;
connect-src 'self' https://reposnse-ishaara.onrender.com;
frame-ancestors 'none';
```

---

## 6. Log Redaction

[`redactSensitiveData()`](file:///home/dev/ishara-web-dashboard/src/lib/server/logger.ts#L34-L49) scrubs:

| Pattern               | Replacement                |
|-----------------------|----------------------------|
| `bearer <token>`      | `Bearer [REDACTED]`        |
| `password=<value>`    | `password=[REDACTED]`      |
| `admin_secret_key=<v>`| `admin_secret_key=[REDACTED]` |
| `x-admin-key: <v>`    | `x-admin-key: [REDACTED]` |
| `postgres://user:pass@` | `postgres://user:[REDACTED]@` |
| `token=<value>`       | `token=[REDACTED]`         |

---

## 7. Timeout & Abuse Protection

| Operation                     | Timeout   | Error Code           |
|-------------------------------|-----------|----------------------|
| Admin upstream requests       | 15,000 ms | `UPSTREAM_TIMEOUT`   |
| Admin session verification    | 6,000 ms  | `AUTH_SERVICE_UNAVAILABLE` |
| Health check backend probe    | 3,500 ms  | N/A (UNAVAILABLE)    |
| Client API requests           | 15,000 ms | `TIMEOUT`            |
| Role cache TTL                | 30,000 ms | N/A (cache refresh)  |
