# ISHAARA Web Dashboard — Post-Release Checklist & Operational Procedures

> **Phase:** A25 — Production Launch & Operational Verification  
> **Document:** Release Protocol & Post-Deployment Cadence  
> **Version:** 1.0.0  

---

## 1. Before Deploy (T - 60 minutes)

- [ ] **Git Working Tree Hygiene:** Ensure all files are tracked, committed, and tagged. Verify zero uncommitted scratch files or debug statements.
- [ ] **Automated Test Run:**
  ```bash
  npm run lint
  npm run typecheck
  npm test
  # Must pass: 17 test suites, 103 tests, 0 failures
  ```
- [ ] **Production Build Test:**
  ```bash
  NODE_ENV=production npm run build
  # Verify 22 routes compiled cleanly
  ```
- [ ] **Secret Exposure Scan:**
  ```bash
  grep -rn "ADMIN_SECRET_KEY" .next/static || echo "CLEAN"
  ```
- [ ] **Environment Audit:** Verify target hosting environment contains:
  - `NEXT_PUBLIC_API_BASE_URL=https://reposnse-ishaara.onrender.com`
  - `ADMIN_SECRET_KEY=<authoritative-key>` (Server-only, no `NEXT_PUBLIC_` prefix)
  - `NODE_ENV=production`
- [ ] **Backend Health Probe:**
  ```bash
  curl -sI https://reposnse-ishaara.onrender.com/api/auth/ok | grep -i "200 OK"
  ```
- [ ] **Notify Stakeholders:** Announce deployment window in release channel.

---

## 2. During Deploy (T - 0)

- [ ] **Trigger Build / Container Deployment:**
  - If deploying via PaaS (Render / Vercel / Railway), monitor build logs in real-time.
  - If deploying via Docker container, ensure healthcheck probe is configured to `/api/health`.
- [ ] **Verify Build Completion:** Confirm container finishes `next build` and starts `next start`.
- [ ] **Port & Process Binding:** Verify application is listening on target `$PORT` without `EADDRINUSE` errors.

---

## 3. Immediately After Deploy (T + 5 minutes)

- [ ] **Liveness Endpoint Check:**
  ```bash
  curl -sI https://<production-domain>/api/health
  # Must return: HTTP 200 OK with x-request-id
  ```
- [ ] **Readiness Probe Check:**
  ```bash
  curl -s https://<production-domain>/api/health?full=true | jq .
  # Verify: status is "ok" (or "degraded" if backend cold start)
  ```
- [ ] **Security Headers Live Audit:**
  ```bash
  curl -sI https://<production-domain>/ | grep -i -E "x-content-type|x-frame|strict-transport|content-security"
  # All 6 headers must be present
  ```
- [ ] **Admin Proxy Boundary Verification:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" https://<production-domain>/api/admin/settlements
  # Must return: 401 Unauthorized
  ```
- [ ] **Execute Core Smoke Tests:**
  - Open `/login` in browser.
  - Authenticate using valid session token.
  - Verify `/dashboard` loads owned agency fleet summary.
  - Verify logout purges session.

---

## 4. 30-Minute Check (T + 30 minutes)

- [ ] **Server Log Review:** Inspect stdout/stderr server logs for unexpected errors or exceptions:
  ```bash
  # Filter for high-severity errors
  grep '"level":"error"' server.log
  ```
- [ ] **Auth Failure Rate:** Ensure `UNAUTHORIZED` or `FORBIDDEN` logs do not exceed baseline thresholds (indicative of token expiration issues or routing loop).
- [ ] **Client Error Tracking:** Verify user feedback or support channels for login friction.
- [ ] **Gateway Latency Check:** Verify `/api/health?full=true` latency to backend is within acceptable limits (`< 1000ms`).

---

## 5. 24-Hour Check (T + 24 hours)

- [ ] **Memory & Uptime Health:** Verify Node.js process has not experienced memory leaks or crash restarts. Check `uptimeSeconds` on `/api/health`.
- [ ] **Settlement Mutation Audit:** Cross-reference platform settlement logs with backend Razorpay ledger to ensure all admin operations synced accurately.
- [ ] **CORS Dependency Status Review:** Re-evaluate `BACKEND-AUTH-CORS-001` status in coordination with backend team.
- [ ] **Sign-Off & Closure:** Log release as successful in operational ledger; close deployment window.
