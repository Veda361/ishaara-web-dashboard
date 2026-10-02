# ISHAARA Web Dashboard — Incident Response Runbook

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Severity Definitions

| Severity | Name     | Definition                                                        | Response Time |
|----------|----------|-------------------------------------------------------------------|---------------|
| P0       | Critical | Platform down, settlement operations blocked, data loss risk      | 15 minutes    |
| P1       | High     | Major feature broken, admin console inaccessible, auth failure    | 1 hour        |
| P2       | Medium   | Degraded performance, partial feature failure, non-blocking error | 4 hours       |
| P3       | Low      | Cosmetic issues, minor UX problems, non-urgent improvements      | 24 hours      |

---

## 2. Incident Detection

### 2.1 Health Endpoints

| Endpoint                  | Check Interval | Alert Threshold         |
|---------------------------|----------------|-------------------------|
| `GET /api/health`         | 30 seconds     | 3 consecutive failures  |
| `GET /api/health?full=true` | 5 minutes    | Backend status ≠ HEALTHY |

### 2.2 Log-Based Alerts

Monitor structured JSON logs for:

```bash
# Server errors (5xx from upstream)
grep '"level":"error"' /var/log/ishaara/*.log

# Auth verification failures (brute force / credential stuffing)
grep '"errorCode":"UNAUTHORIZED"' /var/log/ishaara/*.log | wc -l
# Alert if > 50 in 5 minutes

# Upstream timeouts
grep '"errorCode":"UPSTREAM_TIMEOUT"' /var/log/ishaara/*.log

# Admin key configuration issues
grep '"errorCode":"ADMIN_KEY_NOT_CONFIGURED"' /var/log/ishaara/*.log
```

### 2.3 Key Indicators

| Indicator                              | Normal           | Warning              | Critical           |
|----------------------------------------|------------------|----------------------|--------------------|
| `/api/health` response time            | < 100ms          | > 500ms              | > 2000ms           |
| Backend API latency                    | < 500ms          | > 2000ms             | > 5000ms / timeout |
| UNAUTHORIZED errors per 5min           | < 10             | > 50                 | > 200              |
| UPSTREAM_TIMEOUT per hour              | 0                | > 5                  | > 20               |
| GATEWAY_ERROR per hour                 | 0                | > 3                  | > 10               |

---

## 3. Incident Response Procedures

### 3.1 RUNBOOK: Application Not Starting

**Symptoms:** Server fails to start, blank page on all routes

```bash
# Step 1: Check Node.js process
ps aux | grep next

# Step 2: Check environment
echo $NODE_ENV
echo $NEXT_PUBLIC_API_BASE_URL

# Step 3: Check build artifacts
ls -la .next/

# Step 4: Rebuild if necessary
npm run build 2>&1 | tail -50

# Step 5: Check port availability
lsof -i :3000

# Step 6: Start with verbose logging
NODE_ENV=production npm start 2>&1 | head -100
```

### 3.2 RUNBOOK: Admin Operations Returning 503

**Symptoms:** All admin settlement operations fail with `ADMIN_KEY_NOT_CONFIGURED`

```bash
# Step 1: Verify ADMIN_SECRET_KEY is set
# (Do NOT echo the value)
node -e "console.log('ADMIN_SECRET_KEY set:', !!process.env.ADMIN_SECRET_KEY)"

# Step 2: Check .env.local exists
ls -la .env.local

# Step 3: Verify no NEXT_PUBLIC_ prefix
grep "NEXT_PUBLIC_ADMIN" .env* || echo "Good: No NEXT_PUBLIC_ prefix found"

# Step 4: Restart the server after setting the variable
# Set in hosting platform environment → redeploy
```

### 3.3 RUNBOOK: Backend Unreachable (502/504)

**Symptoms:** API calls return 502 GATEWAY_ERROR or 504 UPSTREAM_TIMEOUT

```bash
# Step 1: Check backend health from server
curl -sI https://reposnse-ishaara.onrender.com/api/v1/users/me

# Step 2: Check readiness endpoint
curl -s https://<domain>/api/health?full=true | jq '.dependencies.backendApi'

# Step 3: If backend is on Render — check for cold start
# Render free tier services spin down after inactivity
# Wait 30-60 seconds for cold start, then retry

# Step 4: Check DNS resolution
nslookup reposnse-ishaara.onrender.com

# Step 5: Verify NEXT_PUBLIC_API_BASE_URL
echo $NEXT_PUBLIC_API_BASE_URL

# Step 6: If INTERNAL_API_BASE_URL is set, verify that too
echo $INTERNAL_API_BASE_URL
```

### 3.4 RUNBOOK: Authentication Failures (401 Spike)

**Symptoms:** Users unable to log in, session restoration failing

```bash
# Step 1: Test token validation directly
curl -s -H "Authorization: Bearer <known-good-token>" \
  https://reposnse-ishaara.onrender.com/api/v1/users/me | jq .

# Step 2: Check if Better Auth is responding
curl -s https://reposnse-ishaara.onrender.com/api/auth/ok

# Step 3: Review server logs for auth failures
grep '"errorCode":"UNAUTHORIZED"' /var/log/ishaara/*.log | tail -20

# Step 4: Clear role cache (requires restart)
# The in-memory cache clears on process restart

# Step 5: If brute force suspected
# Check distinct source IPs in logs
grep '"errorCode":"UNAUTHORIZED"' /var/log/ishaara/*.log | \
  jq -r '.sourceIp' | sort | uniq -c | sort -rn | head -10
```

### 3.5 RUNBOOK: Settlement Processing Failures

**Symptoms:** Settlement process/retry returns errors, batch processing fails

```bash
# Step 1: Check specific settlement status
curl -s -H "Authorization: Bearer <admin-token>" \
  https://<domain>/api/admin/settlements/<settlement-id> | jq .

# Step 2: Check for 409 conflict (already processing)
# If HTTP 409 → settlement has an active lease
# Wait for lease expiry or run reconciliation sweep

# Step 3: Run reconciliation sweep
curl -s -X POST -H "Authorization: Bearer <admin-token>" \
  https://<domain>/api/admin/settlements/reconciliation/sweep | jq .

# Step 4: Check reconciliation audit
curl -s -H "Authorization: Bearer <admin-token>" \
  https://<domain>/api/admin/settlements/reconciliation/audit | jq .

# Step 5: Check Razorpay status (backend team)
# Contact backend team to verify Razorpay Route API connectivity
```

### 3.6 RUNBOOK: OTP Login Not Working (BACKEND-AUTH-CORS-001)

**Symptoms:** OTP send request fails with HTTP 500

```
This is a KNOWN ISSUE: BACKEND-AUTH-CORS-001

Root Cause: Better Auth /api/auth/email-otp/send-verification-otp
returns HTTP 500 on CORS preflight.

Resolution: Awaiting upstream backend fix.

Workaround: Users must enter session token directly on the /login page.

To obtain a session token:
1. Call POST /api/auth/sign-in/email from a non-browser client (curl, Postman)
2. Extract the session token from the response
3. Enter the token on the /login page
```

---

## 4. Escalation Matrix

| Issue Category                | First Responder       | Escalation To          |
|-------------------------------|-----------------------|------------------------|
| Frontend crash / UI bug       | Frontend Engineer     | Senior Frontend Lead   |
| Admin proxy / security        | Security Engineer     | Staff Security Lead    |
| Backend API issues            | Backend Engineer      | Backend Team Lead      |
| Razorpay / payment issues     | Backend Engineer      | Payments Team Lead     |
| Better Auth / OTP issues      | Backend Engineer      | Auth Infrastructure    |
| Hosting / infrastructure      | DevOps Engineer       | SRE Lead               |
| Data discrepancy (settlements)| Admin Operations      | Finance + Backend Team |

---

## 5. Post-Incident Actions

### 5.1 Post-Mortem Template

```markdown
## Incident Post-Mortem

**Date:** YYYY-MM-DD
**Duration:** HH:MM start → HH:MM resolved
**Severity:** P0 / P1 / P2 / P3
**Impact:** (Users affected, operations blocked)

### Timeline
- HH:MM — Incident detected via (health check / user report / log alert)
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Incident resolved, monitoring confirmed

### Root Cause
(Technical explanation)

### Resolution
(What was done to fix it)

### Action Items
- [ ] (Preventive measure 1)
- [ ] (Preventive measure 2)
- [ ] (Monitoring improvement)
```
