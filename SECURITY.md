# TrustDNA Security Documentation

This document describes implemented controls and limitations as of 2026-09-03. It is not a certification or a claim of zero vulnerabilities.

## Implemented Controls

- Passwords use Argon2id; legacy bcrypt hashes can be verified and upgraded.
- Auth cookies are HttpOnly and Secure in production, with SameSite=Lax.
- Access tokens are short-lived JWTs; refresh sessions are persisted and rotation is conditional.
- Current account state is checked for protected API requests. Unsafe API methods validate a supplied browser Origin when present.
- MFA secrets are encrypted at rest; recovery codes are hashed; login challenges are persisted and single-use.
- Prisma is used for application database access and no user-controlled raw SQL sink was identified in the audit.
- Credential VC-JWTs use Ed25519 signatures, `kid`, public JWKS discovery, key rotation, expiry, and database revocation checks.
- API keys are generated randomly, stored as hashes, shown once, scoped, rate-limited, and auditable.
- KYC provider selection fails closed in production. Development KYC cannot produce automated verification or real liveness.
- KYC webhooks have provider signature/timestamp checks and persistent duplicate-event protection.
- Security headers include CSP, HSTS, frame denial, MIME sniffing protection, referrer and permissions policies.
- Structured logging redacts common credentials and identity fields.

## Partially Implemented or Deployment-Dependent

- The production KYC adapter is an isolated provider integration boundary. Provider contract, sandbox, and production behavior must be verified operationally.
- Provider webhook events are authenticated and idempotently recorded, but complete provider-specific business-state application requires a tested event mapping.
- Rate limiting is process-local; distributed storage and trusted proxy configuration are required for multi-instance production.
- Upload validation checks size and magic bytes but does not replace malware scanning, strict parser validation, quarantine, or safe re-encoding.
- API-key authentication is reusable but no business endpoint currently demonstrates machine-authenticated access.
- The repository has no checked-in Prisma migration directory.

## Development-Only Behavior

`KYC_PROVIDER=DEVELOPMENT` is permitted only in development. It does not authenticate documents or people. `ALLOW_DEV_AUTH_TOKENS=true` is for local testing only and must not be enabled on an exposed deployment.

## Security Assumptions

- The deployment terminates TLS correctly and protects runtime environment variables.
- The reverse proxy is configured and trusted before forwarding client IP headers.
- KYC storage is private and provider credentials are server-only.
- Database access is restricted and backups are protected.
- Provider webhook secrets and issuer private keys are managed outside source control.

## Reporting

Report suspected vulnerabilities privately to the project security owner. Include reproduction details without including real credentials, identity documents, API keys, or private keys.
