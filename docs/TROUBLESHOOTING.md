# ISHAARA Web Dashboard — Troubleshooting Guide

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Development Issues

### 1.1 `npm install` / `npm ci` Fails

**Symptom:** Dependency installation errors

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### 1.2 TypeScript Compilation Errors

**Symptom:** `npm run typecheck` reports errors

```bash
# Check TypeScript version
npx tsc --version

# Run type check with verbose output
npx tsc --noEmit --pretty

# If path alias errors (@/...), verify tsconfig.json paths
cat tsconfig.json | jq '.compilerOptions.paths'
```

### 1.3 Dev Server Not Starting

**Symptom:** `npm run dev` fails or shows blank page

```bash
# Check port 3000 is free
lsof -i :3000

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

---

## 2. Authentication Issues

### 2.1 "Session expired" on Every Page Load

**Causes:**
1. Token in `localStorage` is invalid or expired
2. Backend API is unreachable
3. `NEXT_PUBLIC_API_BASE_URL` misconfigured

**Debug:**
```javascript
// Browser console
console.log(localStorage.getItem('ishaara_session_token'));
// If null or empty → user needs to re-login

// Test token manually
fetch('https://reposnse-ishaara.onrender.com/api/v1/users/me', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ishaara_session_token') }
}).then(r => r.json()).then(console.log);
```

### 2.2 Login Page Shows But Cannot Log In

**Cause:** `BACKEND-AUTH-CORS-001` — OTP endpoint returns HTTP 500

**Workaround:**
1. Use a REST client (curl, Postman) to authenticate:
   ```bash
   curl -X POST https://reposnse-ishaara.onrender.com/api/auth/sign-in/email \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "..."}'
   ```
2. Copy the session token from the response
3. Enter the token on the `/login` page using the "Direct Token Entry" method

### 2.3 AGENCY_OWNER Sees "No Registered Agency Found"

**Cause:** Authenticated user has no agencies registered under their ownership in the backend (`GET /api/v1/agencies/me/owned` returns empty array).

**Resolution:**
- Click the **"Create Agency Profile"** button directly on the screen to open the registration dialog.
- Fill in the required agency details (Agency Name, Contact Email, Contact Phone, and optional City and Business Name) and click **"Create Agency"**.
- Upon submission, the agency is registered via `POST /api/v1/agencies`, the dashboard context automatically refreshes, and full fleet dashboard access is granted.
- Alternatively, agencies can also be registered via the mobile app or backend API.

### 2.4 User Redirected to /unauthorized

**Cause:** User's role is `USER` or `DRIVER_CONDUCTOR`

**Resolution:**
- These roles are intentionally blocked from the agency dashboard
- User needs an `AGENCY_OWNER` or `ADMIN` role to access the dashboard

---

## 3. Admin Console Issues

### 3.1 Admin Page Shows "Administrative Access Restricted"

**Causes:**
1. User's role is not `ADMIN`
2. Session expired mid-navigation

**Debug:**
```javascript
// Browser console — check current user role
// (AuthContext state is accessible via React DevTools)
```

### 3.2 All Admin Operations Return HTTP 503

**Symptom:** `ADMIN_KEY_NOT_CONFIGURED` error

**Cause:** `ADMIN_SECRET_KEY` environment variable is not set

**Fix:**
```bash
# Check if set (without revealing value)
node -e "console.log('Set:', !!process.env.ADMIN_SECRET_KEY)"

# Set it in .env.local or hosting platform
echo "ADMIN_SECRET_KEY=<your-secret>" >> .env.local

# Restart server
npm start
```

### 3.3 Settlement Process Returns 409

**Symptom:** "This settlement is already being processed"

**Cause:** An active processing lease exists for this settlement (possibly from a previous failed attempt)

**Resolution:**
1. Wait for the lease to expire (typically 5 minutes)
2. Or run a reconciliation sweep:
   ```bash
   curl -X POST -H "Authorization: Bearer <token>" \
     https://<domain>/api/admin/settlements/reconciliation/sweep
   ```

### 3.4 Settlement Retry Fails with 400

**Symptom:** `MISSING_RETRY_REASON` or `INVALID_REASON_LENGTH`

**Cause:** The retry endpoint requires a `reason` string of ≥ 3 characters

**Fix:** Ensure the request body includes:
```json
{ "reason": "Administrative retry - reason for retry here" }
```

---

## 4. Build & Deployment Issues

### 4.1 Build Fails with Import Errors

**Symptom:** `Module not found` errors during `npm run build`

```bash
# Verify all dependencies installed
npm ci

# Check for missing path alias resolution
grep -r "from '@/" src/ | head -5
# Should match tsconfig.json paths

# Clean build cache
rm -rf .next
npm run build
```

### 4.2 Build Succeeds But Pages Return 500

**Symptom:** Server-side rendering errors in production

```bash
# Check server logs for errors
npm start 2>&1 | grep "error"

# Verify environment variables are set
printenv | grep -E "NEXT_PUBLIC|ADMIN_SECRET|NODE_ENV"

# Test health endpoint
curl http://localhost:3000/api/health
```

### 4.3 Security Headers Missing

**Symptom:** Security scan shows missing headers

**Cause:** Custom hosting may override `next.config.ts` headers

**Verify:**
```bash
curl -sI https://<domain>/ | grep -iE "x-frame|x-content-type|strict-transport|content-security|referrer-policy|permissions-policy"
```

**Fix:** Ensure hosting platform does not strip custom response headers.

---

## 5. Performance Issues

### 5.1 Slow Page Loads

**Possible Causes:**
1. Backend API on Render free tier (cold start ~30s)
2. Large data sets without pagination
3. No client-side caching

**Mitigations:**
- TanStack React Query caches responses in memory
- Pagination is enforced on list endpoints
- Backend cold start is an upstream infrastructure concern

### 5.2 Admin Operations Timing Out (504)

**Cause:** Backend settlement processing > 15 seconds

**Resolution:**
- Check backend logs for processing bottlenecks
- Verify Razorpay Route API connectivity
- Consider increasing timeout in `adminProxy.ts` (currently 15,000ms)

---

## 6. Testing Issues

### 6.1 Tests Failing After Code Changes

```bash
# Run full test suite with verbose output
npm test -- --reporter=verbose

# Run specific test file
npx vitest run tests/AdminAuthorization.test.ts

# Clear vitest cache
npx vitest run --no-cache
```

### 6.2 Test Environment Setup

Tests require the `jsdom` environment configured in `vitest.config.ts`:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  }
});
```

---

## 7. Quick Diagnostic Commands

```bash
# Full system status check
curl -s https://<domain>/api/health?full=true | jq .

# Verify auth works
curl -s -H "Authorization: Bearer <token>" \
  https://reposnse-ishaara.onrender.com/api/v1/users/me | jq '.data.role'

# Check admin proxy works
curl -s -H "Authorization: Bearer <admin-token>" \
  https://<domain>/api/admin/settlements | jq '.success'

# Verify security headers
curl -sI https://<domain>/ 2>&1 | head -20

# Check build output
ls -la .next/BUILD_ID

# Test connectivity to backend
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  https://reposnse-ishaara.onrender.com/api/v1/users/me
```
