# ISHAARA Web Dashboard — Route Inventory

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. UI Pages (App Router)

### 1.1 Public / Unauthenticated Routes

| Route              | File                                        | Auth   | Description                    |
|--------------------|---------------------------------------------|--------|--------------------------------|
| `/`                | `src/app/page.tsx`                          | None   | Landing page / redirect        |
| `/login`           | `src/app/login/page.tsx`                    | None   | Authentication entry point     |
| `/unauthorized`    | `src/app/unauthorized/page.tsx`             | None   | Access denied page             |

### 1.2 Agency Owner Dashboard Routes (AuthGuard)

All routes under `/dashboard/*` are wrapped by [`AuthGuard`](file:///home/dev/ishara-web-dashboard/src/components/layout/AuthGuard.tsx).
Requires: `isAuthenticated === true` AND `role !== USER` AND `role !== DRIVER_CONDUCTOR` AND `ownedAgencies.length > 0`.

| Route                            | File                                                   | Description                          |
|----------------------------------|--------------------------------------------------------|--------------------------------------|
| `/dashboard`                     | `src/app/dashboard/page.tsx`                           | Dashboard home / overview            |
| `/dashboard/drivers`             | `src/app/dashboard/drivers/page.tsx`                   | Driver listing                       |
| `/dashboard/drivers/[id]`        | `src/app/dashboard/drivers/[id]/page.tsx`              | Driver detail                        |
| `/dashboard/vehicles`            | `src/app/dashboard/vehicles/page.tsx`                  | Vehicle listing                      |
| `/dashboard/vehicles/[id]`       | `src/app/dashboard/vehicles/[id]/page.tsx`             | Vehicle detail                       |
| `/dashboard/assignments`         | `src/app/dashboard/assignments/page.tsx`               | Driver ↔ Vehicle assignments         |
| `/dashboard/trips`               | `src/app/dashboard/trips/page.tsx`                     | Trip monitoring                      |
| `/dashboard/operations`          | `src/app/dashboard/operations/page.tsx`                | Operational overview                 |
| `/dashboard/settlements`         | `src/app/dashboard/settlements/page.tsx`               | Agency settlement listing            |
| `/dashboard/settlements/[settlementId]` | `src/app/dashboard/settlements/[settlementId]/page.tsx` | Agency settlement detail           |
| `/dashboard/settings`            | `src/app/dashboard/settings/page.tsx`                  | Agency settings / profile            |

### 1.3 Platform Admin Console Routes (AdminGuard)

All routes under `/admin/*` are wrapped by [`AdminGuard`](file:///home/dev/ishara-web-dashboard/src/components/layout/AdminGuard.tsx).
Requires: `isAuthenticated === true` AND `user.role === "ADMIN"`.

| Route                            | File                                                   | Description                          |
|----------------------------------|--------------------------------------------------------|--------------------------------------|
| `/admin`                         | `src/app/admin/page.tsx`                               | Admin home / system health status    |
| `/admin/settlements`             | `src/app/admin/settlements/page.tsx`                   | Platform settlement mutation console |
| `/admin/settlements/[settlementId]` | `src/app/admin/settlements/[settlementId]/page.tsx`  | Settlement detail + process/retry    |
| `/admin/reconciliation`          | `src/app/admin/reconciliation/page.tsx`                | Reconciliation audit console         |

---

## 2. Server-Side API Routes

### 2.1 Health / Observability

| Method | Route                  | File                                        | Auth   | Description                        |
|--------|------------------------|---------------------------------------------|--------|------------------------------------|
| `GET`  | `/api/health`          | `src/app/api/health/route.ts`               | None   | Liveness probe                     |
| `GET`  | `/api/health?full=true`| `src/app/api/health/route.ts`               | None   | Readiness probe (+ backend check)  |

### 2.2 Admin Settlement Operations (Proxied)

All `/api/admin/*` routes invoke [`proxyAdminRequest()`](file:///home/dev/ishara-web-dashboard/src/lib/server/adminProxy.ts#L123-L343).
Authorization: Bearer session token → server-side role verification → `x-admin-key` injection → upstream forwarding.

| Method | Route                                                       | File                                                                        | Upstream Path                                         | Description                      |
|--------|-------------------------------------------------------------|-----------------------------------------------------------------------------|-------------------------------------------------------|----------------------------------|
| `GET`  | `/api/admin/settlements`                                    | `src/app/api/admin/settlements/route.ts`                                    | `/api/v1/payments/settlements`                        | List all platform settlements    |
| `GET`  | `/api/admin/settlements/[settlementId]`                     | `src/app/api/admin/settlements/[settlementId]/route.ts`                     | `/api/v1/payments/settlements/{id}`                   | Get settlement detail            |
| `POST` | `/api/admin/settlements/[settlementId]/process`             | `src/app/api/admin/settlements/[settlementId]/process/route.ts`             | `/api/v1/payments/settlements/{id}/process`           | Process single settlement        |
| `POST` | `/api/admin/settlements/[settlementId]/retry`               | `src/app/api/admin/settlements/[settlementId]/retry/route.ts`               | `/api/v1/payments/settlements/{id}/retry`             | Retry failed settlement          |
| `POST` | `/api/admin/settlements/[settlementId]/reconcile`           | `src/app/api/admin/settlements/[settlementId]/reconcile/route.ts`           | `/api/v1/payments/settlements/{id}/reconcile`         | Reconcile single settlement      |
| `POST` | `/api/admin/settlements/batch/process`                      | `src/app/api/admin/settlements/batch/process/route.ts`                      | `/api/v1/payments/settlements/batch/process`          | Batch process all pending        |
| `GET`  | `/api/admin/settlements/reconciliation/audit`               | `src/app/api/admin/settlements/reconciliation/audit/route.ts`               | `/api/v1/payments/settlements/reconciliation/audit`   | Reconciliation audit report      |
| `POST` | `/api/admin/settlements/reconciliation/sweep`               | `src/app/api/admin/settlements/reconciliation/sweep/route.ts`               | `/api/v1/payments/settlements/reconciliation/sweep`   | Automated reconciliation sweep   |

### 2.3 Input Validation on Server Routes

| Route                                  | Validation                                                |
|----------------------------------------|-----------------------------------------------------------|
| `[settlementId]/process`               | `isValidSettlementId()` → `/^[a-zA-Z0-9_-]{3,64}$/`     |
| `[settlementId]/reconcile`             | `isValidSettlementId()` → `/^[a-zA-Z0-9_-]{3,64}$/`     |
| `[settlementId]/retry`                 | `isValidSettlementId()` + JSON body + `reason` string ≥ 3 chars |
| `[settlementId]` (GET)                 | `isValidSettlementId()` → `/^[a-zA-Z0-9_-]{3,64}$/`     |

---

## 3. Client-Side API Modules → Backend Endpoints

These are direct browser → backend calls (no server proxy):

| Module                                                | Endpoint Pattern                                    | Auth        |
|-------------------------------------------------------|-----------------------------------------------------|-------------|
| [`auth.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/auth.ts)             | `/api/v1/users/me`, `/api/auth/*`                  | Bearer token |
| [`agencies.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/agencies.ts)     | `/api/v1/agencies/*`                               | Bearer token |
| [`memberships.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/memberships.ts) | `/api/v1/agencies/{id}/memberships/*`            | Bearer token |
| [`vehicles.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/vehicles.ts)     | `/api/v1/agencies/{id}/vehicles/*`                 | Bearer token |
| [`trips.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/trips.ts)           | `/api/v1/agencies/{id}/trips/*`                    | Bearer token |
| [`settlements.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/settlements.ts) (operator) | `/api/v1/operators/{id}/settlements/*`  | Bearer token |
| [`settlements.ts`](file:///home/dev/ishara-web-dashboard/src/lib/api/settlements.ts) (admin)    | `/api/admin/settlements/*` (→ server proxy) | Bearer token |

---

## 4. Layout Hierarchy

```
RootLayout (src/app/layout.tsx)
├── AppProviders (AuthProvider + QueryClientProvider)
│
├── /login                    → No guard
├── /unauthorized             → No guard
│
├── /dashboard/*              → DashboardLayout
│   └── AuthGuard
│       └── Sidebar + TopNav
│           └── Page content
│
└── /admin/*                  → AdminLayout
    └── AdminGuard
        └── AdminSidebar + ErrorBoundary
            └── Page content
```
