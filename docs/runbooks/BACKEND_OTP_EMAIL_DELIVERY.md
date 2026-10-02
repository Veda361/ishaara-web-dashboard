# Backend OTP Email Delivery Operational Runbook

## Executive Summary
This runbook provides diagnostic instructions and remediation steps for the upstream Better Auth email OTP delivery service. 

- **Target Service:** ISHAARA Production Backend (`https://reposnse-ishaara.onrender.com`)
- **Impacted Flow:** Agency Owner Email OTP Authentication (`/login`)
- **Observed Behavior:** HTTP 200 OK with `{"success": true}` returned to the client, but no OTP email is delivered to the recipient mailbox.
- **Classification:** `EXTERNAL — BACKEND EMAIL DELIVERY DEPENDENCY`

---

## 1. Problem Statement
The frontend authentication client triggers OTP dispatch by sending a POST request to:
`POST https://reposnse-ishaara.onrender.com/api/auth/email-otp/send-verification-otp`

Live probes and browser network captures confirm:
1. **CORS Preflight (OPTIONS):** Returns `HTTP 204 No Content` with `Access-Control-Allow-Origin: http://localhost:3000` and required CORS headers.
2. **Dispatch Request (POST):** Returns `HTTP 200 OK` with payload `{"success": true}`.
3. **Delivery Outcome:** No email reaches the recipient inbox, spam, or quarantine folders.

Because `{"success": true}` only confirms that Better Auth accepted the request and completed the handler execution without throwing an uncaught exception, the email delivery pipeline is failing downstream on the backend mailer or provider side.

---

## 2. API Contract Specification

### 2.1 Send Verification OTP Endpoint
- **URL:** `https://reposnse-ishaara.onrender.com/api/auth/email-otp/send-verification-otp`
- **Method:** `POST`
- **Headers:**
  ```http
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "type": "sign-in"
  }
  ```
  *(Note: Backend validation strictly requires `type` to be one of `"email-verification" | "sign-in" | "forget-password" | "change-email"`).*

- **Observed Response (200 OK):**
  ```json
  {
    "success": true
  }
  ```

### 2.2 Verify OTP Endpoint
- **URL:** `https://reposnse-ishaara.onrender.com/api/auth/sign-in/email-otp`
- **Method:** `POST`
- **Headers:**
  ```http
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```
- **Response (200 OK on valid OTP):**
  ```json
  {
    "user": {
      "id": "usr_...",
      "email": "user@example.com",
      "role": "AGENCY_OWNER"
    },
    "token": "sess_..."
  }
  ```
- **Response (400 Bad Request on invalid/expired OTP):**
  ```json
  {
    "message": "Invalid OTP",
    "code": "INVALID_OTP"
  }
  ```

---

## 3. Root Cause Analysis: Pipeline Failure Points

```
[User enters Email] 
       │
       ▼
[Frontend: POST /api/auth/email-otp/send-verification-otp]  ──> PASS (HTTP 200)
       │
       ▼
[Backend Better Auth Handler generates OTP]                 ──> PASS (Validated via sign-in/email-otp)
       │
       ▼
[Backend calls sendVerificationOTP callback]                ──> FAILURE POINT: Silent catch or mock
       │
       ▼
[Backend Mail Transport (SMTP / Nodemailer / Resend)]        ──> FAILURE POINT: Missing env vars / bad auth
       │
       ▼
[Email Provider Gateway (Resend / SendGrid / SES / SMTP)]   ──> FAILURE POINT: Bounce / Domain unverified
       │
       ▼
[Recipient Mail Server / Spam Filter]                       ──> FAILURE POINT: SPF / DKIM / DMARC drop
       │
       ▼
[User Inbox]                                                ──> NOT REACHED
```

### Potential Defect Patterns on Backend
1. **Silent Exception Swallowing:**
   ```typescript
   // Defect pattern in Better Auth configuration:
   emailOTP({
     async sendVerificationOTP({ email, otp, type }, request) {
       try {
         await mailer.sendMail({ to: email, text: `Your code: ${otp}` });
       } catch (err) {
         console.error("Mailer error:", err);
         // Does not rethrow! Better Auth assumes success and returns { success: true }
       }
     }
   })
   ```
2. **Unconfigured or Missing Production Mailer Environment Variables:**
   - The mailer transport falls back to a development/mock logger (e.g. logging OTP to stdout instead of calling an actual SMTP server).
   - Missing or misnamed environment variables in Render (e.g., `SMTP_PASS` vs `SMTP_PASSWORD`, `RESEND_API_KEY`).
3. **Provider Domain / Sender Authentication Rejection:**
   - The `from` address uses an unverified domain (e.g., `no-reply@ishaara.com` without DNS verification on Resend/SendGrid/Postmark).
   - Missing SPF (`v=spf1 ...`), DKIM, or DMARC DNS records causing upstream mail servers (Gmail, Outlook) to silently drop the message.
4. **Network / Port Blocking on Render:**
   - Outbound port 25 or 465/587 blocked, or TLS handshake failure with the SMTP relay.

---

## 4. Required Backend Checks (For Backend API Team)

The Backend API Team must execute the following checklist on Render and the backend codebase:

### 4.1 Better Auth Plugin Configuration
- Locate the Better Auth initialization file (e.g., `src/auth.ts` or `src/server.ts`).
- Inspect the `emailOTP` plugin definition:
  ```typescript
  emailOTP({
    async sendVerificationOTP({ email, otp, type }, request) {
      // 1. Verify that this function calls an active mailer transport.
      // 2. Ensure errors are NOT silently caught. If sending fails, throw an error
      //    so that Better Auth returns an appropriate 500 error instead of false 200.
    }
  })
  ```

### 4.2 Render Production Environment Variables
Verify that the production service on Render (`reposnse-ishaara.onrender.com`) has the required email service environment variables configured:

| Variable Name (Examples) | Status to Check | Notes |
|--------------------------|-----------------|-------|
| `SMTP_HOST` / `EMAIL_HOST` | CONFIGURED / MISSING | Hostname of SMTP relay |
| `SMTP_PORT` / `EMAIL_PORT` | CONFIGURED / MISSING | Typically 587 (STARTTLS) or 465 (SSL) |
| `SMTP_USER` / `EMAIL_USER` | CONFIGURED / MISSING | SMTP username |
| `SMTP_PASSWORD` / `EMAIL_PASS` | CONFIGURED / MISSING | SMTP secret password / app password |
| `SMTP_FROM` / `EMAIL_FROM` | CONFIGURED / MISSING | Verified sender address (e.g., `auth@ishaara.app`) |
| `RESEND_API_KEY` (if Resend) | CONFIGURED / MISSING | Provider API key |
| `SENDGRID_API_KEY` (if SendGrid) | CONFIGURED / MISSING | Provider API key |

> **Security Rule:** Never output or commit real credentials. Only verify their presence and correctness.

### 4.3 Render Service Runtime Logs
Check the runtime logs on Render:
1. Search logs for `"sendVerificationOTP"`, `"mailer"`, `"nodemailer"`, `"SMTP"`, `"resend"`.
2. Check for connection refused, authentication failed, or timeout errors during OTP dispatch requests.
3. Check if the OTP is mistakenly being printed to `console.log` in production instead of being transmitted via SMTP.

### 4.4 Provider Delivery Logs & DNS Verification
1. Log into the email provider console (Resend, SendGrid, Mailgun, Amazon SES, or Google Workspace).
2. Check the **Activity / Delivery Logs** for recent dispatch attempts to test addresses.
3. Inspect delivery status: `Delivered`, `Queued`, `Bounced`, `Suppressed`, or `Rejected`.
4. Verify DNS records:
   - **SPF:** Record includes provider's include mechanism.
   - **DKIM:** CNAME records are valid and verified.
   - **DMARC:** `v=DMARC1; p=none; ...` configured.

---

## 5. Verification Protocol

Once the backend mailer is corrected:
1. Trigger OTP request via:
   ```bash
   curl -i -X POST "https://reposnse-ishaara.onrender.com/api/auth/email-otp/send-verification-otp" \
     -H "Origin: http://localhost:3000" \
     -H "Content-Type: application/json" \
     -d '{"email":"your-controlled-email@example.com","type":"sign-in"}'
   ```
2. Verify receipt of the 6-digit code in the recipient mailbox within 15 seconds.
3. Complete authentication on `http://localhost:3000/login` using the received code.
4. Verify successful redirection to `/dashboard` and role resolution via `/api/v1/users/me`.
