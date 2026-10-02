# ISHAARA Web Dashboard — Deployment & Rollback Runbook

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Prerequisites

### 1.1 System Requirements

| Requirement          | Minimum                  |
|----------------------|--------------------------|
| Node.js              | 22.x                     |
| npm                  | 10.x                     |
| Disk Space           | 500 MB (node_modules + .next) |
| Memory               | 512 MB minimum           |

### 1.2 Required Environment Variables

```bash
NEXT_PUBLIC_API_BASE_URL=https://reposnse-ishaara.onrender.com
ADMIN_SECRET_KEY=<production-admin-secret>
NODE_ENV=production
```

### 1.3 Pre-Deployment Validation

```bash
# 1. Install dependencies
npm ci

# 2. Type checking
npm run typecheck

# 3. Lint validation
npm run lint

# 4. Test suite
npm test

# 5. Production build
npm run build

# Expected: All checks pass with 0 errors
# Expected: 103+ test assertions pass
# Expected: Build completes with 21 routes
```

---

## 2. Deployment Steps

### 2.1 Standard Deployment (Render / Vercel / Railway)

```bash
# Step 1: Pull latest code
git pull origin main

# Step 2: Install dependencies (production)
npm ci --production=false

# Step 3: Build production bundle
NODE_ENV=production npm run build

# Step 4: Start production server
NODE_ENV=production npm start
# Server starts on port 3000
```

### 2.2 Post-Deployment Verification

```bash
# 1. Liveness check
curl -s https://<domain>/api/health | jq .

# Expected response:
# {
#   "status": "ok",
#   "service": "ishaara-web-dashboard",
#   "environment": "production",
#   "timestamp": "...",
#   "uptimeSeconds": N,
#   "requestId": "req_..."
# }

# 2. Readiness check (with backend dependency)
curl -s https://<domain>/api/health?full=true | jq .

# Expected: status "ok", backendApi.status "HEALTHY"

# 3. Security headers check
curl -sI https://<domain>/ | grep -i "strict-transport\|x-frame\|x-content-type\|content-security"

# Expected: All 6 security headers present

# 4. Verify admin operations
curl -s -H "Authorization: Bearer <admin-token>" \
  https://<domain>/api/admin/settlements | jq .status

# Expected: 200 (or 401/403 depending on token validity)
```

### 2.3 Smoke Test Checklist

| Check                                    | Method                                | Expected Result              |
|------------------------------------------|---------------------------------------|------------------------------|
| Homepage loads                           | Browser → `https://<domain>/`         | Redirect to /login or /dashboard |
| Login page accessible                    | Browser → `/login`                    | Login form renders           |
| Health endpoint responds                 | `GET /api/health`                     | `{ status: "ok" }`          |
| Readiness check passes                   | `GET /api/health?full=true`           | `status: "ok"` or `"degraded"` |
| Security headers present                 | `curl -sI /`                          | 6 security headers           |
| Admin route blocks non-admin             | Browser → `/admin` (as AGENCY_OWNER)  | Redirects to /unauthorized   |
| Admin API rejects unauthenticated        | `GET /api/admin/settlements` (no auth)| 401 response                 |

---

## 3. Rollback Procedures

### 3.1 Rollback via Git

```bash
# Identify the last known good commit
git log --oneline -10

# Option A: Revert to specific commit
git checkout <commit-hash>
npm ci
npm run build
npm start

# Option B: Revert the last merge
git revert HEAD
git push origin main
# Trigger automated deployment
```

### 3.2 Rollback via Hosting Platform

#### Render
1. Navigate to **Dashboard → Service → Events**
2. Find the previous successful deploy
3. Click **"Redeploy"** on that event

#### Vercel
1. Navigate to **Project → Deployments**
2. Find the previous successful deployment
3. Click **"..."** → **"Promote to Production"**

### 3.3 Emergency Rollback Checklist

- [ ] Identify the failing deployment
- [ ] Confirm the rollback target (commit hash or deploy ID)
- [ ] Execute rollback
- [ ] Verify liveness: `GET /api/health`
- [ ] Verify readiness: `GET /api/health?full=true`
- [ ] Test login flow manually
- [ ] Notify team via incident channel

---

## 4. Build Output Reference

### 4.1 Expected Route Count

```
Route (app)                                    Size
┌ ○ /                                          ...
├ ○ /admin                                     ...
├ ○ /admin/reconciliation                      ...
├ ○ /admin/settlements                         ...
├ ○ /admin/settlements/[settlementId]          ...
├ ○ /api/admin/settlements                     ...
├ ○ /api/admin/settlements/[settlementId]      ...
├ ○ /api/admin/settlements/[settlementId]/process   ...
├ ○ /api/admin/settlements/[settlementId]/reconcile ...
├ ○ /api/admin/settlements/[settlementId]/retry     ...
├ ○ /api/admin/settlements/batch/process       ...
├ ○ /api/admin/settlements/reconciliation/audit ...
├ ○ /api/admin/settlements/reconciliation/sweep ...
├ ○ /api/health                                ...
├ ○ /dashboard                                 ...
├ ○ /dashboard/assignments                     ...
├ ○ /dashboard/drivers                         ...
├ ○ /dashboard/drivers/[id]                    ...
├ ○ /dashboard/operations                      ...
├ ○ /dashboard/settings                        ...
├ ○ /dashboard/settlements                     ...
├ ○ /dashboard/settlements/[settlementId]      ...
├ ○ /dashboard/trips                           ...
├ ○ /dashboard/vehicles                        ...
├ ○ /dashboard/vehicles/[id]                   ...
├ ○ /login                                     ...
└ ○ /unauthorized                              ...
```

---

## 5. Configuration Files

| File                 | Purpose                                          |
|----------------------|--------------------------------------------------|
| `next.config.ts`     | Security headers, CSP, framework configuration   |
| `tsconfig.json`      | TypeScript compiler options + path aliases (`@/`) |
| `vitest.config.ts`   | Test runner configuration (jsdom environment)     |
| `postcss.config.mjs` | PostCSS + Tailwind CSS processing                |
| `eslint.config.mjs`  | ESLint + next config                             |
| `package.json`       | Dependencies, scripts, project metadata          |
| `.env.local`         | Environment variables (NOT committed)            |
| `.env.example`       | Environment variable template (committed)        |
