# ISHAARA Web Dashboard — Engineering Handoff

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff
> **Status:** CONDITIONAL — EXTERNAL DEPENDENCY REMAINS (`BACKEND-AUTH-CORS-001`)

---

## 1. Project Summary

The ISHAARA Web Dashboard is the administrative and agency-owner operations
console for the ISHAARA Mobility Platform. It provides fleet management
capabilities for transit agency owners and a financial settlement control center
for platform administrators.

### 1.1 Key Stats

| Metric                    | Value                              |
|---------------------------|------------------------------------|
| Framework                 | Next.js 16.3.8 (App Router)       |
| Runtime                   | Node.js 22.x                      |
| Source Files              | 63 TypeScript files                |
| UI Pages                  | 14 pages (11 dashboard + 3 admin)  |
| API Routes                | 9 server-side routes               |
| Test Suites               | 17 test files                      |
| Test Assertions           | 103+                               |
| Dependencies              | 7 production, 11 dev               |
| Production Build Routes   | 21 routes                          |
| Security Headers          | 6 enforced headers                 |

---

## 2. Documentation Index

All documentation lives in [`docs/`](file:///home/dev/ishara-web-dashboard/docs/):

| Document                                                                              | Contents                                          |
|---------------------------------------------------------------------------------------|---------------------------------------------------|
| [`ARCHITECTURE.md`](file:///home/dev/ishara-web-dashboard/docs/ARCHITECTURE.md)       | System architecture, tech stack, layer design      |
| [`ROUTES.md`](file:///home/dev/ishara-web-dashboard/docs/ROUTES.md)                   | Complete route inventory (UI + API)                |
| [`SECURITY.md`](file:///home/dev/ishara-web-dashboard/docs/SECURITY.md)               | Auth flows, RBAC, admin secrets, input validation  |
| [`ENVIRONMENT.md`](file:///home/dev/ishara-web-dashboard/docs/ENVIRONMENT.md)         | Environment variable guide                         |
| [`ERROR_CATALOG.md`](file:///home/dev/ishara-web-dashboard/docs/ERROR_CATALOG.md)     | All error codes and HTTP status mappings            |
| [`DEPLOYMENT.md`](file:///home/dev/ishara-web-dashboard/docs/DEPLOYMENT.md)           | Deployment steps, rollback procedures              |
| [`INCIDENT_RESPONSE.md`](file:///home/dev/ishara-web-dashboard/docs/INCIDENT_RESPONSE.md) | Incident runbooks and escalation matrix        |
| [`TROUBLESHOOTING.md`](file:///home/dev/ishara-web-dashboard/docs/TROUBLESHOOTING.md) | Common issues and diagnostic commands              |
| [`TESTING.md`](file:///home/dev/ishara-web-dashboard/docs/TESTING.md)                 | Test suite, running tests, writing tests           |
| [`API_CONTRACT.md`](file:///home/dev/ishara-web-dashboard/docs/API_CONTRACT.md)       | Frontend ↔ Backend API contract                    |
| [`ENGINEERING_HANDOFF.md`](file:///home/dev/ishara-web-dashboard/docs/ENGINEERING_HANDOFF.md) | This document                                |

---

## 3. Critical Architecture Decisions

### 3.1 Server-Side Admin Proxy

**Decision:** All admin settlement operations proxy through Next.js API routes
instead of calling the backend directly from the browser.

**Rationale:**
- `ADMIN_SECRET_KEY` must never be exposed to the browser
- The `x-admin-key` header is injected server-side only
- Server-side role verification adds a defense-in-depth layer
- Structured logging captures all admin operations

**Reference:**
[`adminProxy.ts`](file:///home/dev/ishara-web-dashboard/src/lib/server/adminProxy.ts)

### 3.2 Role Cache with TTL

**Decision:** Admin session verification results are cached in-memory for 30 seconds.

**Rationale:**
- Prevents auth latency amplification on consecutive admin API calls
- Non-admin roles are also cached to block privilege escalation brute force
- Cache clears on process restart

**Trade-off:** A role change (revocation) takes up to 30 seconds to take effect.

### 3.3 Direct Token Entry (BACKEND-AUTH-CORS-001 Workaround)

**Decision:** The `/login` page supports direct session token entry as a workaround
for the non-functional OTP flow.

**Rationale:**
- `BACKEND-AUTH-CORS-001` (Better Auth OTP endpoint HTTP 500 on CORS preflight)
  blocks the standard OTP login flow
- This is a **known external dependency** awaiting upstream resolution
- The workaround does not compromise security (tokens still validated via
  `GET /api/v1/users/me`)

### 3.4 Dual Token Storage

**Decision:** Session tokens are stored in both `localStorage` and an in-memory variable.

**Rationale:**
- `localStorage` persists across page reloads
- In-memory fallback handles incognito / restricted storage environments
- Both are cleared on logout

### 3.5 Error Message Sanitization

**Decision:** All error messages pass through `sanitizeMessage()` before reaching the UI.

**Rationale:**
- Prevents accidental leakage of internal infrastructure details
- Blocks secrets, internal IPs, database URIs, and stack traces
- Generic safe message substituted when sensitive content detected

---

## 4. Known Issues & External Dependencies

### 4.1 BACKEND-AUTH-CORS-001 (CRITICAL — OPEN)

| Field         | Value                                                      |
|---------------|----------------------------------------------------------|
| Issue ID      | `BACKEND-AUTH-CORS-001`                                    |
| Severity      | HIGH                                                       |
| Status        | OPEN — awaiting upstream fix                               |
| Endpoint      | `POST /api/auth/email-otp/send-verification-otp`          |
| Symptom       | HTTP 500 on CORS preflight request                        |
| Impact        | OTP-based login flow is non-functional                    |
| Workaround    | Direct session token entry on `/login` page               |
| Owner         | Backend / Better Auth infrastructure team                  |
| Frontend Fix  | N/A — this is a backend/infrastructure issue              |

> **DO NOT mark this as resolved** until live verification confirms the OTP
> endpoint responds correctly to CORS preflight + actual POST requests from
> the browser.

### 4.2 Render Cold Start Latency

The backend API is hosted on Render. Free-tier services may experience cold
start delays of 30–60 seconds after periods of inactivity. This can cause:
- Slow initial page loads
- Timeout errors on first admin operations
- Health check readiness returning `DEGRADED`

---

## 5. Codebase Orientation for New Engineers

### 5.1 Getting Started

```bash
# Clone and install
git clone <repo-url>
cd ishara-web-dashboard
npm ci

# Set up environment
cp .env.example .env.local
# Edit .env.local with your ADMIN_SECRET_KEY

# Run dev server
npm run dev
# Open http://localhost:3000

# Run tests
npm test
```

### 5.2 Key Files to Read First

| Priority | File                                                                              | Why                                    |
|----------|-----------------------------------------------------------------------------------|----------------------------------------|
| 1        | [`src/lib/server/adminProxy.ts`](file:///home/dev/ishara-web-dashboard/src/lib/server/adminProxy.ts) | Core security architecture   |
| 2        | [`src/lib/auth/AuthContext.tsx`](file:///home/dev/ishara-web-dashboard/src/lib/auth/AuthContext.tsx)  | Session management logic     |
| 3        | [`src/lib/api/client.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/client.ts)               | HTTP client + auth injection |
| 4        | [`src/lib/errors/index.ts`](file:///home/dev/ishara-web-dashboard/src/lib/errors/index.ts)           | Error handling patterns      |
| 5        | [`src/types/index.ts`](file:///home/dev/ishara-web-dashboard/src/types/index.ts)                     | Domain model                 |
| 6        | [`next.config.ts`](file:///home/dev/ishara-web-dashboard/next.config.ts)                             | Security headers             |
| 7        | [`src/lib/server/logger.ts`](file:///home/dev/ishara-web-dashboard/src/lib/server/logger.ts)         | Logging & redaction          |

### 5.3 Development Patterns

| Pattern                    | Convention                                               |
|----------------------------|----------------------------------------------------------|
| State management           | React Context (AuthContext) + TanStack React Query       |
| API calls (public)         | `apiClient.get/post()` → direct to backend               |
| API calls (admin)          | `apiClient.get/post()` → `/api/admin/*` → server proxy   |
| Route protection           | Layout-level guards (AuthGuard / AdminGuard)             |
| Error display              | `formatApiErrorMessage()` → sanitized string             |
| Money values               | `amountMinor` (integer paise/cents) — never floats       |
| IDs in URLs                | `encodeURIComponent()` + `isValidSettlementId()`         |
| Logging                    | `writeServerLog()` → JSON → redacted                    |

---

## 6. Phase History

| Phase | Name                                          | Outcome                          |
|-------|-----------------------------------------------|----------------------------------|
| A17   | Agency Dashboard Core                         | Completed                        |
| A18   | Settlement & Reconciliation Views             | Completed                        |
| A19   | Admin Operations & Settlement Control Center  | Completed                        |
| A20   | Production Security Validation                | Completed — no critical findings |
| A21   | Production Release & Deployment Validation    | Completed — build validated      |
| A22   | Production Monitoring & Operational Hardening | Completed — observability added  |
| A23   | Production UAT & End-to-End Stabilization     | Completed — 103/103 tests pass   |
| A24   | Production Documentation & Engineering Handoff| This phase                       |

---

## 7. Handoff Checklist

### 7.1 Code Quality

- [x] TypeScript strict mode compilation passes
- [x] ESLint passes with 0 errors
- [x] 103+ test assertions pass
- [x] Production build succeeds with 21 routes
- [x] No `any` type abuse in critical paths

### 7.2 Security

- [x] `ADMIN_SECRET_KEY` is server-only (no `NEXT_PUBLIC_` prefix)
- [x] `x-admin-key` never sent by browser
- [x] Admin role verified server-side on every admin API call
- [x] Settlement IDs validated against path traversal
- [x] Retry reasons validated (type + length)
- [x] Error messages sanitized (no secret leakage)
- [x] Log output redacted (bearer tokens, secrets, IPs)
- [x] Security headers enforced (CSP, HSTS, X-Frame-Options, etc.)
- [x] Non-admin roles blocked from admin routes (client + server)

### 7.3 Observability

- [x] Structured JSON logging with `writeServerLog()`
- [x] Request correlation via `X-Request-ID`
- [x] Health endpoint (liveness + readiness)
- [x] Error boundaries on admin pages
- [x] Operation type tracking (QUERY vs MUTATION)

### 7.4 Documentation

- [x] Architecture document
- [x] Route inventory
- [x] Security reference
- [x] Environment variable guide
- [x] Error catalog
- [x] Deployment runbook
- [x] Incident response runbook
- [x] Troubleshooting guide
- [x] Testing guide
- [x] API contract
- [x] Engineering handoff (this document)

### 7.5 External Dependencies

- [x] Backend API dependency documented
- [x] `BACKEND-AUTH-CORS-001` documented with workaround
- [x] Render cold start latency documented
- [ ] **PENDING:** `BACKEND-AUTH-CORS-001` resolution (upstream team)

---

## 8. Release Readiness Assessment

| Dimension              | Status                                 | Notes                                    |
|------------------------|----------------------------------------|------------------------------------------|
| Build                  | ✅ PASS                                | 21 routes compile successfully           |
| Tests                  | ✅ PASS                                | 103+ assertions, 0 failures             |
| Security               | ✅ PASS                                | All security controls verified           |
| Observability          | ✅ PASS                                | Logging, health, correlation active      |
| Documentation          | ✅ PASS                                | 11 documentation files                   |
| Auth (OTP flow)        | ⚠️ CONDITIONAL                        | `BACKEND-AUTH-CORS-001` open             |
| Backend Availability   | ⚠️ CONDITIONAL                        | Render cold start latency                |
| Overall                | **CONDITIONAL — EXTERNAL DEPENDENCY**  | Frontend is release-ready; blocked by backend |
