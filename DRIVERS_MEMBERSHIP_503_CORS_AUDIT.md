# ISHAARA — DRIVER LIST 503 / CORS ERROR FORENSIC AUDIT REPORT

**Date:** 2026-10-03  
**Target Environments:**  
- Production Frontend: `https://ishaara-web-dashboard.vercel.app`  
- Production Backend: `https://reposnse-ishaara.onrender.com`  
- Endpoint Under Investigation: `/api/v1/agencies/{agencyId}/memberships`  

---

## 1. Exact Failing Request

- **HTTP Method:** `OPTIONS` (CORS Preflight)
- **Request URL:** `https://reposnse-ishaara.onrender.com/api/v1/agencies/6abfc5c876fbc787b93052d3/memberships?page=1&limit=10`
- **Observed Browser Status:** `503 Service Unavailable`
- **Browser Label:** `CORS error`
- **Observed Browser Error Body:** `Content-Length: 0`

---

## 2. Exact HTTP Status & Infrastructure Evidence

- **HTTP Status:** `503 Service Unavailable`
- **Server:** `cloudflare`
- **Critical Infrastructure Header:**
  ```http
  X-Render-Routing: hibernate-wake-error
  ```
- **Analysis:**
  The 503 was generated at the **Render ingress / routing layer**, NOT inside the Express / Node application. Render was unable to wake the hibernated backend instance before the gateway timeout elapsed, returning an HTTP 503 gateway response without routing to the application container. Because the infrastructure 503 response omitted standard CORS headers (`Access-Control-Allow-Origin`), Chrome/Brave flagged the response as a "CORS error".

---

## 3. Preflight (OPTIONS) Result

When tested outside the browser while the backend is warm:
```bash
curl -i -X OPTIONS 'https://reposnse-ishaara.onrender.com/api/v1/agencies/6abfc5c876fbc787b93052d3/memberships?page=1&limit=10' \
  -H 'Origin: https://ishaara-web-dashboard.vercel.app' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization,content-type'
```

**Output:**
```http
HTTP/2 204 No Content
date: Sat, 03 Oct 2026 06:22:52 GMT
access-control-allow-credentials: true
access-control-allow-headers: Content-Type,Authorization,x-admin-key,Cookie
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
access-control-allow-origin: https://ishaara-web-dashboard.vercel.app
rndr-id: 7d55a119-9524-4f7d
server: cloudflare
vary: Origin
```

- When the backend instance is awake, preflight OPTIONS succeeds with `204 No Content` and full CORS headers.
- Query parameters `?page=1&limit=10` are completely valid and do NOT cause any preflight failure when the instance is awake.

---

## 4. GET Result & Membership Contract

- **Test:** `GET /api/v1/agencies/6abfc5c876fbc787b93052d3/memberships?page=1&limit=10`
- **Response (Unauthenticated probe):** `HTTP/2 401 Unauthorized`
  ```json
  {"success":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required. Please sign in."}}
  ```
  - Contains `access-control-allow-origin: https://ishaara-web-dashboard.vercel.app` and `access-control-allow-credentials: true`.
- **Contract Verification:**
  - `page` and `limit` are standard query parameters supported by the backend membership route schema.
  - The previous observation of `?limit=50` succeeding while `?page=1&limit=10` returned 503 was a timing coincidence caused by Render's hibernation wake state, not a query parameter contract mismatch.

---

## 5. Frontend State Model Defect & Confusion

In [`src/app/dashboard/drivers/page.tsx`](file:///home/dev/ishara-web-dashboard/src/app/dashboard/drivers/page.tsx):
1. **The UI previously collapsed error into empty state:**
   ```tsx
   {error && <Alert variant="danger">Failed to load drivers for this agency...</Alert>}
   {isLoading ? <TableSkeleton /> : filteredItems.length === 0 ? <NoDriverRecordsFound /> : ...}
   ```
2. When the query failed, `filteredItems` was `[]`. As a result, the user saw BOTH:
   - An error alert: `"Failed to load drivers for this agency. Please check connection and retry."`
   - An empty state card: `"No driver records found. No drivers match the current filters for your agency fleet."`
3. This conveyed false information to users and testers, implying that no drivers exist even though the request failed completely.

---

## 6. Root Cause Classification

- **Category:** **Render Infrastructure Transient Hibernation Wake Error** with **Frontend State Segregation & Resilience Defect**.
- **Not a CORS configuration bug:** The server correctly responds with `Access-Control-Allow-Origin: https://ishaara-web-dashboard.vercel.app` whenever it is awake.
- **Not a Query Contract bug:** Both `page` and `limit` are supported parameters.
- **Transient Gateway Failure:** Render's free/starter tier spins down inactive instances. During wake-up, the routing layer returned `503 Service Unavailable` with `X-Render-Routing: hibernate-wake-error`. The browser masked this as a "CORS error" due to missing CORS headers on the infrastructure 503 page.
- **Frontend Vulnerability:** The frontend lacked bounded retry for transient 503 errors and erroneously rendered the empty-data card concurrently with the error banner.

---

## 7. Exact Fix Applied

### A. State Disjunction in [`src/app/dashboard/drivers/page.tsx`](file:///home/dev/ishara-web-dashboard/src/app/dashboard/drivers/page.tsx)
Separated the view into four mutually exclusive states:
1. **State A (Error):** Dedicated error card displaying `formatApiErrorMessage(error)` with a manual `"Retry Request"` button and spinning indicator. The empty state card is strictly suppressed.
2. **State B (Loading):** `<TableSkeleton />`
3. **State C (Genuine Empty State):** Rendered ONLY when the query succeeds (`!error && !isLoading`) and returned 0 items.
4. **State D (Data Table):** Standard desktop table and mobile card views.

### B. Bounded Query Retry Strategy
Configured React Query with a bounded retry policy:
```typescript
retry: (failureCount, err) => {
  if (failureCount >= 2) return false;
  const status = (err as { status?: number })?.status;
  // Do not retry 4xx client errors
  if (status && status >= 400 && status < 500) return false;
  return true;
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
```
Transient 503 / wake errors are retried automatically up to 2 times with exponential backoff (1s, 2s) while the Render instance finishes booting, avoiding premature error displays. Client errors (401, 403, 400, 404) are never retried.

### C. Error Message Translation
Standardized through `formatApiErrorMessage(error)`, which maps 503 to:
`"Administrative service is currently unavailable. Please try again later."` and network failures to clear, actionable guidance.

---

## 8. Verification & Tests

1. **Vitest Unit Tests:**
   - Added specific tests in [`tests/DriverMembershipDetailContract.test.tsx`](file:///home/dev/ishara-web-dashboard/tests/DriverMembershipDetailContract.test.tsx):
     - `When listMemberships fails (503), displays error state and does NOT display 'No driver records found'` (PASS).
     - `When listMemberships returns empty list [], displays genuine empty state without error alert` (PASS).
   - Total Suite: **21 test files, 130 tests passing (100% PASS)**.
2. **TypeScript:** `npm run typecheck` passed cleanly (`0 errors`).
3. **ESLint:** `npm run lint` passed with 0 errors.
4. **Next.js Production Build:** `npm run build` compiled all 22 static and dynamic routes successfully.
