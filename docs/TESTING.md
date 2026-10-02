# ISHAARA Web Dashboard — Testing Guide

> **Version:** 1.0.0
> **Last Updated:** 2025-10-02
> **Phase:** A24 — Production Documentation & Engineering Handoff

---

## 1. Testing Framework

| Component        | Technology                   | Version |
|------------------|------------------------------|---------|
| Test Runner      | Vitest                       | ^5.0.3  |
| DOM Environment  | jsdom                        | ^29.1.1 |
| React Testing    | @testing-library/react       | ^16.3.3 |
| Matchers         | @testing-library/jest-dom    | ^7.0.1  |
| React Plugin     | @vitejs/plugin-react         | ^6.1.1  |

---

## 2. Test Suite Inventory

### 2.1 Test Files (17 suites)

| File                                     | Domain                         | Focus                                |
|------------------------------------------|--------------------------------|--------------------------------------|
| `AdminAuthorization.test.ts`             | Authorization                  | Admin role verification              |
| `AdminConcurrentMutation.test.ts`        | Settlements                    | 409 conflict handling                |
| `AdminReconciliationAudit.test.ts`       | Reconciliation                 | Audit integrity checks               |
| `AdminSecretSecurity.test.ts`            | Security                       | ADMIN_SECRET_KEY isolation           |
| `AdminSettlementMutation.test.ts`        | Settlements                    | Process/retry/reconcile flows        |
| `AdminStateAwareness.test.ts`            | State                          | UI state management                  |
| `AgencyMembershipContract.test.ts`       | Memberships                    | Membership API contracts             |
| `AgencyVehicleAssignment.test.ts`        | Assignments                    | Vehicle-driver assignment logic      |
| `InputValidationSecurity.test.ts`        | Security                       | Input sanitization & validation      |
| `OperationalObservabilityA22.test.ts`    | Observability                  | Logging, health, request correlation |
| `ProductionSecurityValidationA20.test.ts`| Security                       | Phase A20 security audit validations |
| `ProductionUATA23.test.ts`              | UAT                           | End-to-end production workflows      |
| `ServerAdminProxySecurity.test.ts`       | Security                       | Admin proxy behavior & edge cases    |
| `SettlementAuthorization.test.ts`        | Authorization                  | Settlement access control            |
| `SettlementMoneyPrecision.test.ts`       | Financial                      | Money arithmetic precision           |
| `SettlementStrictContract.test.ts`       | Contracts                      | API response contract validation     |
| `SettlementTenantIsolation.test.ts`      | Multi-tenancy                  | Agency data isolation                |

### 2.2 Setup File

[`tests/setup.ts`](file:///home/dev/ishara-web-dashboard/tests/setup.ts) — Minimal test environment initialization

---

## 3. Running Tests

### 3.1 Commands

```bash
# Run all tests (single run)
npm test

# Run with verbose output
npx vitest run --reporter=verbose

# Run specific test file
npx vitest run tests/AdminAuthorization.test.ts

# Run tests matching a pattern
npx vitest run --testNamePattern "settlement"

# Watch mode (development)
npx vitest

# No cache
npx vitest run --no-cache
```

### 3.2 Expected Output

```
✓ tests/AdminAuthorization.test.ts (X tests)
✓ tests/AdminConcurrentMutation.test.ts (X tests)
✓ tests/AdminReconciliationAudit.test.ts (X tests)
...
✓ tests/ProductionUATA23.test.ts (X tests)

Test Files  17 passed (17)
Tests       103+ passed
Duration    ~Xs
```

---

## 4. Test Coverage Areas

### 4.1 Security Testing

| Test Area                           | Validated Behavior                                      |
|-------------------------------------|---------------------------------------------------------|
| Admin secret isolation              | `ADMIN_SECRET_KEY` not in client bundles                |
| `x-admin-key` header isolation      | Never sent from browser, only server-side              |
| Role verification                   | Non-ADMIN roles (USER, DRIVER_CONDUCTOR, AGENCY_OWNER) blocked |
| Settlement ID validation            | Path traversal, SQL injection, XSS payloads blocked    |
| Retry reason validation             | Empty, missing, too-short reasons rejected             |
| Error message sanitization          | Internal IPs, secrets, stack traces stripped            |
| Bearer token redaction              | Tokens redacted in log output                          |

### 4.2 Business Logic Testing

| Test Area                           | Validated Behavior                                      |
|-------------------------------------|---------------------------------------------------------|
| Settlement state transitions        | Process, retry, reconcile workflows                    |
| Concurrent mutation (409)           | Lease conflict detection and UI feedback               |
| Money precision                     | `amountMinor` integer arithmetic (no floating point)   |
| Tenant isolation                    | Agency-scoped data cannot cross boundaries             |
| Membership lifecycle                | PENDING → ACTIVE/REJECTED transitions                  |
| Vehicle-driver assignment           | Assignment/unassignment flow                           |

### 4.3 Observability Testing

| Test Area                           | Validated Behavior                                      |
|-------------------------------------|---------------------------------------------------------|
| Structured logging                  | JSON format with required fields                       |
| Request correlation                 | X-Request-ID propagation through proxy chain           |
| Health endpoint liveness            | `/api/health` returns status + uptime                  |
| Health endpoint readiness           | `/api/health?full=true` includes backend dependency    |
| Sensitive data redaction            | No secrets in log output                               |

---

## 5. Writing New Tests

### 5.1 Test File Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do expected behavior', () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected);
  });
});
```

### 5.2 Key Test Utilities

```typescript
// Import types
import { SettlementRecord, User, Agency } from '@/types';

// Import functions under test
import { isValidSettlementId, verifyAdminSession } from '@/lib/server/adminProxy';
import { redactSensitiveData } from '@/lib/server/logger';
import { formatApiErrorMessage, ApiError } from '@/lib/errors';
```

### 5.3 Testing Conventions

- Test files live in `/tests/` (not colocated with source)
- Test names describe behavior, not implementation
- Each test validates a single assertion where possible
- Security tests verify both positive (allowed) and negative (blocked) cases
- Financial tests use `amountMinor` (integer cents), never floating point

---

## 6. Configuration

### 6.1 `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### 6.2 Path Aliases

Tests use the same `@/` path alias as source code, resolved via the `resolve.alias` in vitest config.
