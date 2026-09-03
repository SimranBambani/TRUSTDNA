# TrustDNA Phase 9 Security Audit

**Assessment date:** 2026-09-03  
**Scope:** Application source, API routes, middleware, Prisma schema, configuration, scripts, existing tests, and existing security reports.  
**Method:** Read-only static review plus existing automated checks. No claim of zero vulnerabilities is made.

## Executive Summary

The existing security reports are stale and materially overstate the application's security posture. Prisma parameterization, Argon2id password hashing, secure cookie flags, EdDSA credential signatures, API-key hashing, and several input controls are present. However, the application still has critical and high-risk authorization, KYC, session, webhook, and data-protection weaknesses.

## Findings

### CRITICAL-01: Legacy KYC endpoint auto-approves identity

- **Severity:** Critical
- **Location:** `src/app/api/identity/route.ts`, `src/server/services/identity.service.ts`
- **Impact:** Any authenticated user can obtain an approved KYC request, activate their account, and receive verification/trust benefits without document or provider verification.
- **Attack scenario:** Submit `{ "provider": "INTERNAL" }` to `POST /api/identity`. The server creates an approved request, fabricates a document path, and marks the user active.
- **Fix:** Remove the legacy approval path or route it through the real KYC state machine. Never accept a client-selected provider or create `APPROVED` state without a verified provider result.
- **Status:** Remediation required.

### HIGH-01: Unauthenticated webhook route accepts arbitrary JSON

- **Severity:** High
- **Location:** `src/middleware.ts`, `src/app/api/webhooks/kyc/route.ts`
- **Impact:** Forged webhook events may be accepted as legitimate integration events.
- **Attack scenario:** Send arbitrary JSON to `/api/webhooks/kyc`; middleware bypasses authentication and the route responds successfully without signature verification or schema validation.
- **Fix:** Remove the unused route or require provider-specific HMAC verification, timestamp tolerance, event ID replay protection, schema validation, and idempotent state application.
- **Status:** Remediation required.

### HIGH-02: Access tokens are not checked against persisted session/account state

- **Severity:** High
- **Location:** `src/server/api.ts`, `src/lib/jwt.ts`, session model and auth services
- **Impact:** Logout, password reset, suspension, banning, or role changes do not immediately invalidate existing access tokens. Stale admin tokens remain usable until JWT expiry.
- **Attack scenario:** Steal an access cookie, log out or suspend the account, then continue calling protected APIs with the still-valid JWT.
- **Fix:** Resolve the JWT `jti` to an active, unexpired persisted session and verify current user status and role on protected requests. Revoke sessions on logout and security events.
- **Status:** Remediation required.

### HIGH-03: MFA challenge tokens are replayable

- **Severity:** High
- **Location:** `src/lib/jwt.ts`, `src/app/api/auth/mfa/verify/route.ts`
- **Impact:** A captured five-minute MFA challenge can be reused, and successful TOTP/recovery authentication is not represented as a one-time consumed operation.
- **Attack scenario:** Replay a previously accepted challenge and valid code during the challenge validity window.
- **Fix:** Persist a hashed, single-use MFA challenge bound to the login attempt, consume it atomically, and track recovery-code use and any required TOTP replay window.
- **Status:** Remediation required.

### HIGH-04: Refresh-token rotation is raceable

- **Severity:** High
- **Location:** `src/server/services/auth.service.ts` refresh flow
- **Impact:** Concurrent requests can reuse one refresh token and create multiple replacement sessions.
- **Attack scenario:** Send the same refresh cookie concurrently; both requests pass the initial active-session check before either update commits.
- **Fix:** Atomically consume the source session with a conditional update and detect refresh-family reuse.
- **Status:** Remediation required.

### HIGH-05: Organization-scoped member access trusts JWT organization context

- **Severity:** High
- **Location:** `src/app/api/org/members/route.ts`, `src/server/services/org.service.ts`
- **Impact:** Organization member PII can be exposed if a token contains or retains an incorrect organization claim.
- **Attack scenario:** Use a token with another organization ID to call the member-list route; the service does not verify current membership for reads.
- **Fix:** Resolve membership from the database for every organization-scoped operation and enforce the required role.
- **Status:** Remediation required.

### HIGH-06: Credential issuance lacks subject and organization policy checks

- **Severity:** High
- **Location:** `src/server/services/credential.service.ts`
- **Impact:** An authorized issuer may issue credentials for a nonexistent subject, suspended organization, or unsupported claim set.
- **Attack scenario:** Submit an arbitrary UUID or sensitive/unapproved claims to the credential issuance endpoint.
- **Fix:** Verify subject existence, active organization state, issuer role, credential-type schema, and permitted claims before signing.
- **Status:** Remediation required.

### HIGH-07: Verified provider webhooks are acknowledged but not applied

- **Severity:** High
- **Location:** `src/app/api/kyc/provider/webhook/route.ts`
- **Impact:** Valid provider decisions do not update the associated KYC state, leaving the application inconsistent and encouraging unsafe client-driven completion.
- **Attack scenario:** Provider sends a valid completed event; the route records receipt but never validates ownership or transitions the KYC state.
- **Fix:** Validate event schema/session ownership, apply allowed transitions transactionally, and record idempotent processing outcomes.
- **Status:** Remediation required.

### MEDIUM-01: Cookie-authenticated state changes lack CSRF/origin defense

- **Severity:** Medium
- **Location:** API routes and `src/middleware.ts`
- **Impact:** Cross-site requests may trigger state-changing actions where browser cookie behavior permits them.
- **Attack scenario:** A malicious site submits a cross-origin form or browser request to a cookie-authenticated mutation.
- **Fix:** Validate `Origin`/`Referer` on unsafe methods and use a synchronizer or double-submit CSRF token. Keep SameSite protections as defense in depth.
- **Status:** Remediation required.

### MEDIUM-02: Rate limiter is process-local and trusts spoofable client IP headers

- **Severity:** Medium
- **Location:** `src/lib/rate-limit.ts`
- **Impact:** Limits reset on restart, do not coordinate across instances, and may be bypassed by spoofed `x-forwarded-for` headers.
- **Attack scenario:** Rotate instances or submit attacker-controlled forwarding headers to evade login, MFA, webhook, or API-key limits.
- **Fix:** Use a distributed store, trusted proxy configuration, and account/device/key dimensions in addition to IP.
- **Status:** Remediation required.

### MEDIUM-03: Upload body is buffered before size rejection

- **Severity:** Medium
- **Location:** `src/app/api/kyc/document/upload/route.ts`, `src/lib/kyc/file-security.ts`
- **Impact:** Oversized multipart bodies can consume application memory before file validation runs.
- **Attack scenario:** Submit a very large multipart upload repeatedly to exhaust memory or worker capacity.
- **Fix:** Enforce proxy/framework body limits and stream to quarantine storage with bounded reads.
- **Status:** Remediation required.

### MEDIUM-04: File validation is not malware/content validation

- **Severity:** Medium
- **Location:** `src/lib/kyc/file-security.ts`
- **Impact:** Magic bytes alone do not detect malware, malformed parser payloads, decompression bombs, or polyglot files.
- **Attack scenario:** Upload a malicious image/PDF that passes the short signature check and reaches downstream processing.
- **Fix:** Quarantine uploads, use malware scanning and strict parser validation, reject malformed files, and re-encode images where appropriate.
- **Status:** Remediation required.

### MEDIUM-05: KYC responses expose excessive identity/provider data

- **Severity:** Medium
- **Location:** KYC start, upload, liveness, and submit routes
- **Impact:** DOB, OCR/MRZ data, storage paths, and provider/liveness metadata may be returned to the browser unnecessarily.
- **Attack scenario:** A browser extension, compromised frontend dependency, or history/log collector captures sensitive response data.
- **Fix:** Return narrow DTOs containing status, step, and non-sensitive identifiers only. Never return raw provider results, MRZ, storage paths, or liveness tokens unless explicitly required by a provider SDK.
- **Status:** Remediation required.

### MEDIUM-06: Unpersisted credentials bypass custom expiration checking

- **Severity:** Medium
- **Location:** `src/server/services/credential.service.ts` public verification fallback
- **Impact:** A cryptographically valid token not found in the local database can be reported active despite an expired `expirationDate`.
- **Attack scenario:** Present a valid old token to the public endpoint after local credential metadata has been deleted or is unavailable.
- **Fix:** Validate standard JWT `exp` and the VC expiration date before returning active for unpersisted tokens.
- **Status:** Remediation required.

### MEDIUM-07: CSP allows unsafe inline and eval script execution

- **Severity:** Medium
- **Location:** `next.config.ts`
- **Impact:** XSS or dependency compromise has a larger execution surface.
- **Attack scenario:** A content injection uses inline script or eval-compatible code permitted by the policy.
- **Fix:** Remove `unsafe-eval` and `unsafe-inline`; use nonces/hashes and a CSP compatible with the actual Next.js runtime.
- **Status:** Remediation required.

### MEDIUM-08: Development reset/verification tokens are returned based only on NODE_ENV

- **Severity:** Medium
- **Location:** auth registration, forgot-password, and resend-verification routes
- **Impact:** A development deployment exposed outside localhost can disclose account takeover tokens.
- **Attack scenario:** Deploy with `NODE_ENV=development` and call public auth routes to retrieve raw tokens.
- **Fix:** Gate token return behind an explicit local-only test flag and reject it outside loopback/test environments.
- **Status:** Remediation required.

## Lower-Risk Findings and Test Gaps

- `requireApiKey()` is not attached to a business endpoint, so API-key authorization is not integration-tested.
- `AuditService.logAsync()` is fire-and-forget; security events can be lost during process failure.
- No explicit CORS allowlist is configured; same-origin defaults are not an API policy.
- Public credential verification exposes signed claims; claim schemas do not restrict sensitive data.
- Diagnostic scripts print identity data and should be local-only.
- No SQL injection or direct user-controlled SSRF sink was found in the reviewed application code. Prisma application queries are parameterized.
- React output uses escaping and no `dangerouslySetInnerHTML` sink was found.
- Existing tests do not cover IDOR, authorization isolation, stale sessions, refresh races, MFA replay, CSRF, webhook application/replay, API-key integration, sensitive responses, or security headers.

## Existing Controls

Argon2id password hashing, HttpOnly cookies, production Secure cookies, strict Zod schemas in many routes, Prisma parameterization, EdDSA credential signatures with `kid`, API-key hashing, HMAC/timestamp primitives for the production KYC adapter, and structured logging redaction are present. These controls reduce risk but do not eliminate the findings above.

## Post-Remediation Status

The critical legacy KYC approval route and duplicate unauthenticated webhook route now fail closed. Protected API session checks reject deleted, suspended, and banned users; organization member reads verify live membership; browser-origin checks protect unsafe API methods; MFA challenges are persisted and single-use; refresh rotation is conditional; KYC DTOs are minimized; development auth tokens require an explicit flag; and credential expiration is checked for unpersisted tokens.

The following findings remain operational or require further deployment-specific work: HIGH-07 provider webhook business-state application, MEDIUM-02 distributed rate limiting and trusted proxy configuration, MEDIUM-03 streaming/body limits, MEDIUM-04 malware and parser scanning, and full credential issuance policy validation. These are not represented as resolved by passing static checks.

## Accepted/Remaining Risks After Remediation

A production KYC provider, malware scanning service, distributed rate-limit store, trusted proxy configuration, secret-management system, and complete authenticated integration environment are operational dependencies. Their security and availability remain deployment responsibilities. Formal W3C Verifiable Credential compliance is not claimed.
