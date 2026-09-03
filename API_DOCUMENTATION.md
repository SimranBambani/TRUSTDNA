# TrustDNA API Reference

All protected endpoints require the authenticated session cookie unless stated otherwise. Unsafe methods are subject to same-origin `Origin` validation when a browser sends an Origin header. Error bodies are not a stable public contract.

## Public

- `GET /api/health`: service health response.
- `GET /api/credentials/verify?token=...`: verifies an Ed25519 VC-JWT and checks local credential status when available.
- `GET /api/credentials/keys`: returns public JWKS only. It never returns private keys.
- `POST /api/kyc/provider/webhook`: provider-specific signed webhook endpoint with timestamp and event replay protection.

## Authentication

- `POST /api/auth/register`: validates and creates an unverified account.
- `POST /api/auth/verify-email`: consumes an email verification token.
- `POST /api/auth/login`: authenticates credentials and may return an MFA challenge.
- `POST /api/auth/mfa/verify`: consumes a single-use MFA challenge and verifies TOTP/recovery authentication.
- `POST /api/auth/refresh`: rotates a refresh session atomically.
- `POST /api/auth/logout`: revokes the refresh session and clears cookies.
- `POST /api/auth/forgot-password`: starts password reset without account enumeration.
- `POST /api/auth/reset-password`: consumes a reset token and revokes active sessions.
- `POST /api/auth/mfa/setup`, `/confirm`, `/disable`: manage MFA for an authenticated account.

## KYC and Identity

- `GET /api/identity`: returns the current user's profile and legacy verification request metadata.
- `POST /api/identity`: retired; returns `410`. It cannot approve identity.
- `POST /api/kyc/start`: starts/resumes the configured provider workflow.
- `POST /api/kyc/personal-info`: saves validated personal information.
- `POST /api/kyc/document/upload`: validates and submits a document to the provider.
- `POST /api/kyc/liveness/session`: starts provider liveness; development mode fails closed.
- `POST /api/kyc/submit`: runs the configured decision workflow.
- `GET /api/kyc/status`: returns a minimized workflow status DTO.

## Credentials

- `GET /api/credentials`: lists credentials for the authenticated subject.
- `POST /api/credentials`: issues a credential for an authorized organization issuer.
- `GET /api/credentials/:id`: reads a credential for an authorized participant.
- `DELETE /api/credentials/:id`: revokes a credential for its issuer or authorized organization administrator.

Credential issuance signs with the configured Ed25519 issuer private key. Credential verification uses the public key selected by JWT `kid`; public keys are discoverable through JWKS. Formal W3C compliance is not claimed.

## Organizations and API Keys

- `POST /api/org`: creates an organization.
- `GET /api/org/members`: lists members after live membership validation.
- `POST /api/org/api-keys`: creates a persistent API key; the raw key is returned once.
- `GET /api/org/api-keys`: lists metadata without hashes or raw keys.
- `DELETE /api/org/api-keys/:id`: revokes an API key.
- `DELETE /api/org/api-keys?id=:id`: compatibility form of revocation.

The reusable `requireApiKey` guard accepts `Authorization: Bearer ...` or `x-api-key`, verifies the stored digest, checks status/expiry/organization state/scopes, rate-limits, updates usage, and audits use. It must be attached explicitly to any future machine-authenticated business route.

## Trust and Administration

- `GET /api/trust/score`: current trust score.
- `GET /api/trust/events`: trust event history.
- `GET/PATCH /api/notifications`: notification list and read updates.
- `GET /api/admin`: platform-admin operations.
- `GET /api/fraud`: protected fraud operations.

## Limits and Data Handling

Request-specific rate limits are in route code and are currently process-local. Production should use a distributed limiter and trusted proxy configuration. KYC DTOs intentionally omit raw document, MRZ, storage, provider, and liveness-token data.
