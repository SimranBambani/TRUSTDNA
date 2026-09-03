# TrustDNA Remaining Work

This list reflects the current source tree. A task is not marked complete merely because code exists; runtime/provider/database validation is required where noted.

## High Priority

- [ ] Apply and review Prisma migrations for `ApiKey`, `KYCWebhookEvent`, `MfaChallenge`, and credential fields. The repository has no checked-in migration directory.
- [ ] Complete provider-specific KYC webhook event mapping and transactional KYC state transitions.
- [ ] Validate the ONFIDO/PERSONA adapter against a provider sandbox and production contract.
- [ ] Add malware scanning, quarantine, strict image/PDF parsing, safe re-encoding, and bounded streaming uploads.
- [ ] Replace process-local rate limiting with a distributed store and configure trusted proxy IP handling.
- [ ] Attach `requireApiKey` to a real machine-authenticated business endpoint and test organization scope isolation.
- [ ] Validate credential issuance subject/org policy and claim schemas.
- [ ] Complete authenticated integration and E2E tests against a disposable database and provider sandbox.

## Implemented, Pending Runtime Verification

- Authentication flows: registration, email verification, login, logout, refresh, password reset, and MFA.
- Persisted session checks, single-use MFA challenges, and conditional refresh rotation.
- Organization API-key lifecycle and Ed25519 credential signing/JWKS rotation.
- KYC workflow, development fail-closed behavior, production provider boundary, signed webhook primitives, and minimized KYC responses.
- Security headers, same-origin unsafe-method checks, structured redacted logging, and route rate limits.

## Development-Only

- `KYC_PROVIDER=DEVELOPMENT` is permitted only in development and cannot verify documents, liveness, or produce automated verification.
- `ALLOW_DEV_AUTH_TOKENS=true` is for local testing only and must not be enabled on an exposed deployment.
- `npm run db:seed` and diagnostic scripts are for non-production environments.

## Testing Gaps

The default suite includes deterministic unit and MFA tests. Integration and E2E suites are environment-gated and skipped without a real running application. Runtime coverage is still needed for IDOR, organization isolation, stale sessions, MFA replay, refresh reuse, CSRF, provider webhooks, API keys, upload limits, sensitive responses, and production headers.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the production-readiness checklist and [SECURITY_AUDIT_PHASE9.md](SECURITY_AUDIT_PHASE9.md) for audit findings and accepted risks.
