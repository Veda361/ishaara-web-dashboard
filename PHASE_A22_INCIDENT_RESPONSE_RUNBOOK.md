# ISHAARA FRONTEND PHASE A22
# INCIDENT RESPONSE RUNBOOK — OPERATIONS & OBSERVABILITY

**System:** ISHAARA Web Dashboard (Agency Owner + Platform Admin Console)  
**Version:** 1.0.0 (Phase A22)  
**Date:** 2026-10-02  
**Classification:** Institutional Financial Operations  
**Platform:** Node.js 22 LTS / Next.js 16.3.8 App Router  
**Upstream Backend:** `https://reposnse-ishaara.onrender.com`  

---

## 1. Incident Response Principles

1. **Safety First**: Never bypass authentication, role checks, or secret isolation to resolve an outage.
2. **Double-Entry Financial Invariance**: Never re-trigger non-idempotent settlement payouts or sweeps blindly.
3. **Redaction & Privacy**: Debugging logs must never contain `ADMIN_SECRET_KEY`, `x-admin-key`, session tokens, Bearer headers, or banking credentials.
4. **Standard Operating Cycle**: For every incident, follow:
   - **DETECT**
   - **CONFIRM**
   - **CONTAIN**
   - **DIAGNOSE**
   - **MITIGATE**
   - **VERIFY**
   - **DOCUMENT**

---

## 2. Incident Runbook Scenarios

### Scenario 1: Frontend Service Unavailable (HTTP 502 / 503 / Crash)

- **DETECT**: Uptime monitor or load balancer reports frontend down. `/api/health` unreachable.
- **CONFIRM**:
  ```bash
  curl -I -s http://localhost:3000/api/health
  # Or production URL
  curl -I -s https://<PRODUCTION_FRONTEND_DOMAIN>/api/health
  ```
- **CONTAIN**: Direct traffic away to maintenance holding page if Node process is crash-looping.
- **DIAGNOSE**:
  - Inspect server stdout/stderr logs for memory exhaust or unhandled exceptions.
  - Check Node.js process status: `ps aux | grep "next-server"`.
- **MITIGATE**:
  - Restart the Next.js process: `npm run build && npm run start`.
  - On Render: Click `Manual Deploy` → `Clear build cache & deploy`.
  - On Vercel: Promote previous stable deployment or trigger instant redeploy.
- **VERIFY**:
  - `GET /api/health` returns HTTP 200 with `{"status":"ok"}`.
- **DOCUMENT**: Record downtime duration, root cause, and restart logs in incident ticket.

---

### Scenario 2: Upstream Core Backend API Unavailable (HTTP 502 / 503 / Gateway Timeout)

- **DETECT**: `/api/health?full=true` reports `backendApi.status: UNAVAILABLE` or `DEGRADED`.
- **CONFIRM**:
  ```bash
  curl -I -s "https://reposnse-ishaara.onrender.com/api/v1/users/me"
  ```
- **CONTAIN**: The frontend automatically masks backend downtime with localized alerts and safe messages (`"Financial settlement gateway is currently unavailable or timed out"`).
- **DIAGNOSE**:
  - Check if Render instance `reposnse-ishaara.onrender.com` is in sleep/hibernation mode (`x-render-routing: hibernate-wake-error`).
  - Check upstream PostgreSQL connection pool exhaustion.
- **MITIGATE**:
  - Trigger wake request or contact Backend Platform SRE team to restart Render web service.
- **VERIFY**:
  - Repeat probe until HTTP 401/200 is returned instead of 503 hibernate error.
- **DOCUMENT**: Escalate to Backend SRE team; note duration in status log.

---

### Scenario 3: Authentication Outage / Better Auth OTP Failure (BACKEND-AUTH-CORS-001)

- **DETECT**: User reports `"Failed to send verification email"` or browser console CORS preflight 500 error on `/api/auth/email-otp/send-verification-otp`.
- **CONFIRM**:
  ```bash
  curl -i -X OPTIONS "https://reposnse-ishaara.onrender.com/api/auth/email-otp/send-verification-otp" \
    -H "Origin: https://<FRONTEND_ORIGIN>" \
    -H "Access-Control-Request-Method: POST"
  ```
- **CONTAIN**:
  - Advise authorized operators and admins to authenticate via direct **Session Bearer Token** on `/login` (`"Use Session Token"` mode).
- **DIAGNOSE**:
  - Check upstream mailer configuration (`RESEND_API_KEY`, SMTP environment variables).
- **MITIGATE**:
  - Backend team must deploy mailer configuration fix on upstream server.
- **VERIFY**:
  - OPTIONS returns HTTP 200 with `Access-Control-Allow-Origin`.
- **DOCUMENT**: Update status of issue `BACKEND-AUTH-CORS-001`.

---

### Scenario 4: Admin API Proxy Failing (HTTP 503 `ADMIN_KEY_NOT_CONFIGURED`)

- **DETECT**: Admin actions on `/admin/settlements` fail with HTTP 503.
- **CONFIRM**:
  - Inspect server response payload:
    ```json
    {"error":{"code":"ADMIN_KEY_NOT_CONFIGURED"}}
    ```
- **CONTAIN**: The proxy halts requests automatically without contacting upstream backend.
- **DIAGNOSE**:
  - Server environment is missing `ADMIN_SECRET_KEY`.
- **MITIGATE**:
  - Inject authoritative `ADMIN_SECRET_KEY` into server environment variables via hosting dashboard (e.g. Render Dashboard `Environment` → `ADMIN_SECRET_KEY` or Vercel Environment Variables).
  - Redeploy server.
- **VERIFY**:
  - Execute authenticated admin request; verify response returns authoritative data rather than 503.
- **DOCUMENT**: Confirm key was set exclusively in server-side private environment.

---

### Scenario 5: Settlement Financial Mutation Failure / Leased Concurrency Conflict (HTTP 409)

- **DETECT**: Settlement action displays `"This settlement is already being processed"`.
- **CONFIRM**:
  - Backend returned HTTP 409 with `LEASE_CONFLICT`.
- **CONTAIN**:
  - Do NOT repeatedly click Retry or Process buttons. Concurrency lock is active.
- **DIAGNOSE**:
  - Check `/admin/settlements/[settlementId]` to inspect `status` and `updatedAt`.
  - Check whether lock has exceeded 15-minute lease expiration.
- **MITIGATE**:
  - If lease age > 15 minutes, navigate to `/admin/reconciliation` and execute **Reconciliation Sweep** to atomically release stale leases.
- **VERIFY**:
  - Settlement state transitions back to `FAILED` or `PROCESSED`.
- **DOCUMENT**: Log `settlementId`, `requestId`, and sweep outcome.

---

### Scenario 6: Discrepancy Invariant Violation (7-Point Audit Alert)

- **DETECT**: `/admin/reconciliation` reports `DISCREPANCIES DETECTED` (e.g. Amount Mismatch, Missing Provider Ref).
- **CONFIRM**:
  - Inspect discrepancy table on `/admin/reconciliation`.
- **CONTAIN**:
  - Freeze batch processing for the affected transit operator.
- **DIAGNOSE**:
  - Click `Inspect` on the discrepancy row to open Settlement Detail.
  - Cross-check Razorpay Route dashboard for transfer ID and status.
- **MITIGATE**:
  - Click `Reconcile State` to query payment gateway and synchronize state.
- **VERIFY**:
  - Re-run `Refresh Audit` on `/admin/reconciliation`; verify discrepancy count drops to 0.
- **DOCUMENT**: File financial incident report with double-entry ledger reconciliation notes.

---

### Scenario 7: High 5xx Upstream Rate / Gateway Timeouts (HTTP 504)

- **DETECT**: Increased incidence of 504 `UPSTREAM_TIMEOUT` on `/api/admin/settlements`.
- **CONFIRM**:
  - Inspect server structured logs:
    ```json
    {"level":"error","errorCode":"UPSTREAM_TIMEOUT","durationMs":15000}
    ```
- **CONTAIN**:
  - Next.js 15-second proxy timeout aborts connection safely without deducting funds.
- **DIAGNOSE**:
  - Backend payment worker experiencing slow response from payment gateway.
- **MITIGATE**:
  - Wait for provider API latency to normalize. Advise operators against repeated manual triggers.
- **VERIFY**:
  - Normal request durations (<1000ms) resume in server logs.

---

### Scenario 8: Credential Leakage / Secret Exposure Alert

- **DETECT**: Secret scanner or log monitor alerts on potential secret string.
- **CONFIRM**:
  - Identify source of alert (client bundle, log, or header).
- **CONTAIN**:
  - Immediately rotate `ADMIN_SECRET_KEY` on upstream backend and frontend server environment.
- **DIAGNOSE**:
  - Inspect git diff or bundle analyzer to determine if leak occurred in code or runtime log.
  - Note: Phase A22 logger automatically redacts `admin_secret_key`, `x-admin-key`, and tokens.
- **MITIGATE**:
  - Invalidate all active admin session tokens in backend database.
  - Flush user role cache on frontend server.
- **VERIFY**:
  - Grep `.next/static` to verify 0 hits.
  - Confirm old secret key returns 403 on upstream.
- **DOCUMENT**: Security incident report submitted to Chief Information Security Officer (CISO).

---

### Scenario 9: Unexpected Non-Admin Authorization Failure (403 Privilege Escalation Attempt)

- **DETECT**: User with `AGENCY_OWNER`, `DRIVER_CONDUCTOR`, or `USER` role attempts to invoke `/api/admin/*`.
- **CONFIRM**:
  - Server log shows:
    ```json
    {"level":"warn","status":403,"errorCode":"FORBIDDEN","route":"/api/admin/settlements"}
    ```
- **CONTAIN**:
  - Server-side role guard [verifyAdminSession](file:///home/dev/ishara-web-dashboard/src/lib/server/adminProxy.ts) strictly terminates request before upstream dispatch.
- **DIAGNOSE**:
  - Verify actor user ID from session. Determine if user account is compromised.
- **MITIGATE**:
  - Suspend user session if malicious intent is suspected.
- **VERIFY**:
  - Ensure `x-admin-key` was never dispatched.
- **DOCUMENT**: Security audit log entry created with actor details.

---

### Scenario 10: Production Deployment Regression / Rollback Trigger

- **DETECT**: Post-deployment smoke test fails, automated tests regress, or critical routes fail with 500.
- **CONFIRM**:
  - Execute smoke check: `curl -I http://localhost:3000/api/health`.
- **CONTAIN**:
  - Trigger immediate rollback to previous production build/tag.
- **MITIGATE**:
  - Follow A21 Rollback Plan:
    - On Render: Select previous build deploy in dashboard → `Rollback to this deploy`.
    - On Vercel: `vercel rollback` or Dashboard `Promote to Production`.
    - On Docker: Re-tag container to previous commit SHA.
- **VERIFY**:
  - Verify `/api/health` returns 200 and security headers are intact.
- **DOCUMENT**: Post-mortem review within 24 hours.

---

## 3. Operational Escalation Contacts

| Role | Responsibility | Escalation Target |
|---|---|---|
| Frontend On-Call Engineer | Next.js runtime, UI rendering, proxy routing | SRE Team Pager |
| Backend Platform Lead | Core API, PostgreSQL, Render services | Backend On-Call |
| Payment Gateway Lead | Razorpay Route, Beneficiary Bank status | FinOps Lead |
| Application Security Lead | Secret rotation, auth bypass, privilege escalation | SecOps Hotline |
