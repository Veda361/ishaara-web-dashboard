# ISHAARA Web Dashboard — Environment Variables Guide

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Complete Environment Variable Reference

### 1.1 Required Variables

| Variable                   | Scope    | Required | Default                                     | Description                                    |
|----------------------------|----------|----------|---------------------------------------------|------------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | Client + Server | Yes | `https://reposnse-ishaara.onrender.com` | Backend API base URL. Available to browser.    |
| `ADMIN_SECRET_KEY`         | Server Only | Yes* | None                                        | Secret key for admin operations. **Never** prefix with `NEXT_PUBLIC_`. |

\* Required only for admin settlement operations. Agency dashboard functions without it.

### 1.2 Optional Variables

| Variable                   | Scope    | Required | Default                                     | Description                                    |
|----------------------------|----------|----------|---------------------------------------------|------------------------------------------------|
| `INTERNAL_API_BASE_URL`    | Server Only | No   | Falls back to `NEXT_PUBLIC_API_BASE_URL`    | Override for server-side → backend routing. Use for internal networking. |
| `NODE_ENV`                 | Both     | No       | `development`                               | Set to `production` for production builds.     |

---

## 2. Scope Rules

### 2.1 NEXT_PUBLIC_ Prefix (Client-Exposed)

Variables prefixed with `NEXT_PUBLIC_` are **bundled into the client-side JavaScript** at build time.

| ✅ Safe for NEXT_PUBLIC_           | ❌ NEVER use NEXT_PUBLIC_ for     |
|-------------------------------------|-------------------------------------|
| Public API base URLs                | `ADMIN_SECRET_KEY`                  |
| Feature flags (non-sensitive)       | Database credentials                |
| Analytics IDs                       | Internal service URLs               |
|                                     | Private keys or tokens              |

### 2.2 Server-Only Variables

Variables **without** `NEXT_PUBLIC_` prefix are:
- Available in Server Components, API Routes, and `next.config.ts`
- **Not** available in Client Components or browser JavaScript
- Accessed via `process.env.VARIABLE_NAME`

---

## 3. Environment File Templates

### 3.1 Development (`.env.local`)

```bash
# Backend API URL (client + server accessible)
NEXT_PUBLIC_API_BASE_URL=https://reposnse-ishaara.onrender.com

# Server-side ONLY administrative secret key
# NEVER prefix with NEXT_PUBLIC_
ADMIN_SECRET_KEY=your-admin-secret-key-here
```

### 3.2 Production

```bash
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=https://reposnse-ishaara.onrender.com

# Server-side admin key (set in hosting platform, NOT in .env files)
ADMIN_SECRET_KEY=<production-admin-secret>

# Optional: Internal API routing for service mesh
# INTERNAL_API_BASE_URL=http://backend-service:3001
```

### 3.3 Staging

```bash
NEXT_PUBLIC_API_BASE_URL=https://staging-api.ishaara.example.com
ADMIN_SECRET_KEY=<staging-admin-secret>
```

---

## 4. Variable Usage Map

| Variable                   | Used In                                                          |
|----------------------------|------------------------------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | `src/lib/api/client.ts` (L3-4), `src/app/api/health/route.ts` (L4-7), `src/lib/server/adminProxy.ts` (L4-7) |
| `ADMIN_SECRET_KEY`         | `src/lib/server/adminProxy.ts` (L194)                           |
| `INTERNAL_API_BASE_URL`    | `src/lib/server/adminProxy.ts` (L5), `src/app/api/health/route.ts` (L5) |
| `NODE_ENV`                 | `src/lib/server/logger.ts` (L77), `src/app/api/health/route.ts` (L24) |

---

## 5. Security Checklist

- [ ] `ADMIN_SECRET_KEY` is set in production hosting environment (e.g., Render, Vercel, Railway)
- [ ] `ADMIN_SECRET_KEY` is **NOT** committed to Git
- [ ] `ADMIN_SECRET_KEY` does **NOT** have `NEXT_PUBLIC_` prefix
- [ ] `.env.local` is listed in `.gitignore`
- [ ] `.env.example` documents expected variables without real values
- [ ] Production `NEXT_PUBLIC_API_BASE_URL` points to the correct backend

---

## 6. Failure Behavior

| Missing Variable           | Effect                                                      |
|----------------------------|-------------------------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | Falls back to `https://reposnse-ishaara.onrender.com`       |
| `ADMIN_SECRET_KEY`         | Admin operations return HTTP 503 `ADMIN_KEY_NOT_CONFIGURED` |
| `INTERNAL_API_BASE_URL`    | Server uses `NEXT_PUBLIC_API_BASE_URL` instead              |
| `NODE_ENV`                 | Defaults to `development` (logs show `development`)         |
