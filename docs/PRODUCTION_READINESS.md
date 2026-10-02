# ISHAARA Web Dashboard — Production Readiness Assessment

> **Phase:** A25 — Production Launch & Operational Verification  
> **Status:** CONDITIONALLY PRODUCTION READY (External Dependency Remains: `BACKEND-AUTH-CORS-001`)  
> **Date:** 2026-10-02  
> **Repository:** `ishaara-dashboard/` (`ishara-web-dashboard`)  
> **Runtime Environment:** Node.js 22.x | Next.js 16.3.8 (App Router) | React 19.2.8 | TypeScript 5.x  

---

## 1. Production Architecture Overview

The ISHAARA Web Dashboard serves as the institutional administrative portal and agency-owner operations console for the ISHAARA Mobility Platform.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Production Client (Browser)                     │
│                                                                        │
│   ┌─────────────────────┐   ┌───────────────────┐  ┌────────────────┐  │
│   │   AuthContext       │   │ Agency Dashboard  │  │ Admin Console  │  │
│   │ (Better Auth Session│   │   (/dashboard/*)  │  │   (/admin/*)   │  │
│   └──────────┬──────────┘   └─────────┬─────────┘  └────────┬───────┘  │
│              │                        │                     │          │
│              └──────────────┬─────────┘                     │          │
│                             │                               │          │
│               apiClient (Bearer session token)              │          │
│                             │                               │          │
└─────────────────────────────┼───────────────────────────────┼──────────┘
                              │                               │
                              ▼                               ▼
               ┌──────────────────────────────┐ ┌────────────────────────┐
               │    Production Backend        │ │ Next.js Production App │
               │   (onrender.com: Cloudflare) │ │ Server (/api/admin/*)  │
               │                              │ │                        │
               │  - /api/v1/users/me          │ │ 1. Session verify      │
               │  - /api/v1/agencies/*        │ │ 2. Role authorization  │
               │  - /api/v1/operators/*       │ │ 3. Inject x-admin-key  │
               │  - /api/v1/payments/*        │◄┼────────────────────────┘
               └──────────────────────────────┘   Server-to-Server Only
```

### 1.1 Architectural Guarantees
- **Client Tier:** Consists of statically optimized and client-rendered React 19 tree. Never receives or stores platform administrative secrets.
- **Server Tier:** Next.js Route Handlers (`/api/admin/settlements/*` and `/api/health`) act as a security gateway. Role verification is performed against the backend `/api/v1/users/me` before attaching server-side `x-admin-key`.
- **Backend Tier:** Hosted at `https://reposnse-ishaara.onrender.com` behind Cloudflare edge.

---

## 2. Deployment Architecture

| Component | Target / Specification |
|---|---|
| **Hosting Platform** | Standalone Node.js server container / PaaS (Render, Vercel, Railway, Docker) |
| **Node.js Runtime** | `>= 22.20.5` |
| **Process Manager** | `next start` (Port 3000 / configurable via `PORT`) |
| **Build Artifacts** | Standalone Turbopack build in `.next/` |
| **Static Assets** | `.next/static/` served with immutable cache controls (`s-maxage=31536000`) |
| **CI/CD** | `CI/CD NOT CONFIGURED` in repository (manual release / external runner required) |

---

## 3. Required Environment Variables

| Variable | Scope | Required | Default | Safe for Client? | Purpose |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Client + Server | **Yes** | `https://reposnse-ishaara.onrender.com` | **Yes** | Authoritative public backend API base URL. |
| `ADMIN_SECRET_KEY` | Server-Only | **Yes\*** | None (must be set in host) | **NO (CRITICAL)** | Server secret for privileged settlement mutations. |
| `INTERNAL_API_BASE_URL` | Server-Only | No | Falls back to `NEXT_PUBLIC_API_BASE_URL` | **NO** | Optional private network URL for backend routing. |
| `NODE_ENV` | Client + Server | No | `development` (set to `production`) | **Yes** | Controls build optimizations and log output. |

\* Required for `/admin/settlements` mutation routes.

---

## 4. Production URLs

- **Production Backend API:** `https://reposnse-ishaara.onrender.com`
- **Backend Health Check:** `https://reposnse-ishaara.onrender.com/api/auth/ok`
- **Production API Prefix:** `/api/v1`
- **Frontend Health Endpoint:** `/api/health`
- **Frontend Deep Health Probe:** `/api/health?full=true`

---

## 5. Health Checks & Probes

| Endpoint | HTTP Status | Timing | Exposed Data | Auth Required |
|---|---|---|---|---|
| `GET /api/health` | `200 OK` | `< 10ms` | `{ status: "ok", service, environment, timestamp, uptimeSeconds, requestId }` | None |
| `GET /api/health?full=true` | `200 OK` | `< 3500ms` (bounded) | Adds `dependencies.backendApi` and `dependencies.authCorsEndpoint` | None |

### Failure Behavior
- If backend is unavailable or exceeds 3,500ms, `/api/health?full=true` returns `status: "degraded"` with `backendApi.status: "UNAVAILABLE"` while keeping HTTP 200 to prevent premature container restarts.
- No database credentials, secrets, or internal stack traces are ever exposed.

---

## 6. Authentication Production Verification

| Check | Expected Behavior | Verification Status |
|---|---|---|
| **Unauthenticated Visitor** | Navigating to `/dashboard/*` or `/admin/*` redirects to `/login` | **PASS** |
| **Token Session Restoration** | On reload, `AuthContext` invokes `GET /api/v1/users/me` with Bearer token | **PASS** |
| **Invalid Session Token** | Backend 401 triggers token purge from storage and redirects to `/login` | **PASS** |
| **Direct URL Access** | Direct access to deep routes without token redirects before rendering | **PASS** |
| **Logout** | Purges `ishaara_session_token`, `ishaara_active_agency_id`, and React state | **PASS** |
| **Browser Back Navigation** | Back navigation after logout cannot access protected screens | **PASS** |

---

## 7. Role-Based Access Control (RBAC)

Enforced authoritatively at both UI router level and server proxy level:

| Role | `/login` | `/dashboard/*` | `/admin/*` | `/api/admin/settlements/*` |
|---|---|---|---|---|
| `ANONYMOUS` | Allowed | Redirect `/login` | Redirect `/login` | 401 Unauthorized |
| `USER` (Passenger) | Allowed | Redirect `/unauthorized` | Redirect `/unauthorized` | 403 Forbidden |
| `DRIVER_CONDUCTOR` | Allowed | Redirect `/unauthorized` | Redirect `/unauthorized` | 403 Forbidden |
| `AGENCY_OWNER` | Allowed | Allowed (scoped) | Redirect `/unauthorized` | 403 Forbidden |
| `ADMIN` | Allowed | Allowed | Allowed | 200 OK (proxied) |

---

## 8. Tenant Isolation Verification

1. **Agency Ownership Scope:** Agency owners only receive agencies returned by `/api/v1/agencies/owned`.
2. **Client Scope Validation:** `AuthContext.setActiveAgency()` strictly verifies that target agency belongs to `ownedAgencies`. Query parameters (`?agencyId=`) are not blindly trusted.
3. **Cache Partitioning:** All TanStack React Query keys explicitly incorporate the authoritative `agencyId` (e.g. `["agency-memberships", agencyId, statusFilter, page]`).
4. **Logout State Sanitization:** Logout completely destroys active and owned agency records in memory and `localStorage`.

---

## 9. Security Verification & Secret Protection

- **Bundle Analysis (`.next/static`):** Exhaustive search confirmed **0 matches** for `ADMIN_SECRET_KEY` or `x-admin-key`.
- **Header Injection:** `x-admin-key` is only injected within `src/lib/server/adminProxy.ts` on the Node.js server.
- **Fail-Safe Missing Key:** If `ADMIN_SECRET_KEY` is omitted, server returns `503 Service Unavailable` with `ADMIN_KEY_NOT_CONFIGURED` without leaking configuration details.
- **Error Sanitization:** `sanitizeMessage()` intercepts 14 distinct sensitive patterns (passwords, tokens, database URIs, internal IPs) before errors reach UI.

---

## 10. CORS & Upstream API Status

| Check | Status | Evidence |
|---|---|---|
| `GET /api/auth/ok` | **HEALTHY** | Returns `200 OK` (`{"ok":true}`) |
| `GET /api/v1/users/me` (Direct) | **HEALTHY** | Returns `401 Unauthorized` as expected without token |
| `OPTIONS /api/auth/email-otp/...` | **BLOCKED** | Upstream returns `HTTP 500 INTERNAL_SERVER_ERROR` |
| `OPTIONS /api/v1/users/me` | **BLOCKED** | Upstream returns `HTTP 500 INTERNAL_SERVER_ERROR` |

**Classification:** `BACKEND-AUTH-CORS-001` remains **OPEN — EXTERNAL BACKEND DEPENDENCY**.  
**Production Workaround:** Direct token entry on `/login` page allows full dashboard operation without triggering broken OTP preflight.

---

## 11. Security Headers Matrix

Verified on live HTTP/1.1 response from production server:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https://reposnse-ishaara.onrender.com; frame-ancestors 'none';
```

---

## 12. Observability & Logging

- **Format:** Structured single-line JSON (`writeServerLog`).
- **Fields:** `timestamp`, `level`, `service`, `environment`, `requestId`, `route`, `method`, `status`, `durationMs`, `errorCode`, `actorRole`, `operationType`.
- **Redaction:** `redactSensitiveData()` automatically scrubs Bearer tokens, DB connection strings, passwords, and admin keys.
- **APM / External Monitoring:** `NOT CONFIGURED` (no Sentry, Datadog, or external agent installed).

---

## 13. Financial Precision & Calculations

- **Rule:** Frontend never calculates settlement totals, tax, commission, or fee splits locally.
- **Unit Standard:** Integer minor units (paise) are received directly from backend.
- **Formatter:** `formatMoneyMinor(amountMinor, currency)` safely converts integer paise to formatted currency string (e.g. `4500` -> `₹45.00`) without floating-point drift.
- **Audit:** Zero instances of `parseFloat` or unsafe arithmetic found in financial UI paths.

---

## 14. Rollback Readiness

- **Current Git Commit:** Main branch baseline.
- **Deployment Mechanism:** Blue/green container redeploy or Git revert.
- **State Dependencies:** No client-side database migrations. Rollback requires only pointing hosting traffic to previous image or commit.
- **Environment Rollback:** If rotating `ADMIN_SECRET_KEY`, both backend and frontend server environment variables must match.

---

## 15. Known Issues & External Dependencies

1. **`BACKEND-AUTH-CORS-001` (OPEN — EXTERNAL BACKEND DEPENDENCY):**
   - The upstream backend at `https://reposnse-ishaara.onrender.com` fails HTTP OPTIONS preflight with `500 Internal Server Error`.
   - Blocks automated browser-side email OTP dispatch.
   - Workaround: Direct session token authentication is active.
2. **`CI/CD NOT CONFIGURED` (OPERATIONAL FINDING):**
   - Repository lacks `.github/workflows` or hosting pipeline scripts. Build and deployment must be initiated manually or configured via hosting integration.

---

## 16. Final Release Gate

| Gate Category | Verification Item | Status |
|---|---|---|
| **Build** | Turbopack compilation (`npm run build`) | **PASS** |
| **Types** | TypeScript check (`npm run typecheck`) | **PASS** |
| **Lint** | ESLint check (`npm run lint`) | **PASS** |
| **Tests** | Vitest test suite (`npm test`, 17 suites, 103 tests) | **PASS** |
| **Auth** | Session verification & token restoration | **PASS** |
| **RBAC** | AuthGuard & AdminGuard boundaries | **PASS** |
| **Tenancy** | Agency ownership isolation | **PASS** |
| **Secrets** | Admin secret server-only isolation | **PASS** |
| **Headers** | 6 security headers verified on live response | **PASS** |
| **Health** | `/api/health` and `/api/health?full=true` | **PASS** |
| **CORS** | Browser preflight to upstream backend | **BLOCKED (External)** |
| **Financial** | Minor unit integer precision & no client math | **PASS** |
| **Logging** | Redacted structured JSON logs | **PASS** |

### Release Assessment:
**CONDITIONALLY PRODUCTION READY** (Frontend verified; blocked solely by upstream backend CORS dependency `BACKEND-AUTH-CORS-001`).
