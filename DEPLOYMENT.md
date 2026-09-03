# TrustDNA Deployment Guide

## Production Preconditions

- Set `NODE_ENV=production`.
- Set `KYC_PROVIDER` explicitly to `ONFIDO` or `PERSONA`. `DEVELOPMENT` and missing provider configuration are rejected.
- Configure the selected provider's API credential, webhook secret, and base URL.
- Configure `VC_ISSUER_PRIVATE_KEY`, `VC_ISSUER_PUBLIC_KEY`, and `VC_ISSUER_KEY_ID` through a secret manager or equivalent protected runtime secret store. Never commit or bake private keys into source or client bundles.
- Keep `ALLOW_DEV_AUTH_TOKENS` unset or `false`.
- Use a valid 32-byte hexadecimal `ENCRYPTION_KEY` and a strong `JWT_SECRET` of at least 32 characters.
- Use HTTPS, a private KYC storage bucket, trusted reverse-proxy forwarding configuration, and a distributed rate-limit store.
- Apply reviewed Prisma migrations. Do not use `prisma db push` as the production migration process.

## Required Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` enables production guards. |
| `DATABASE_URL` | Yes | Runtime PostgreSQL connection. |
| `DIRECT_DATABASE_URL` | Migration | Direct migration connection when needed. |
| `JWT_SECRET` | Yes | Session JWT signing secret. |
| `ENCRYPTION_KEY` | Yes | 64-hex-character AES-256 field encryption key. |
| `KYC_PROVIDER` | Production | `ONFIDO` or `PERSONA`. |
| Selected provider variables | Production | API key/token, webhook secret, and base URL. |
| `VC_ISSUER_PRIVATE_KEY` | Production | Ed25519 PKCS#8 private key. |
| `VC_ISSUER_PUBLIC_KEY` | Production | Ed25519 SubjectPublicKeyInfo public key. |
| `VC_ISSUER_KEY_ID` | Production | Current credential signing key ID. |
| `VC_ISSUER_PUBLIC_KEYS` | Rotation | JSON map of previous key IDs to public PEM values. |

See `.env.example` for the complete development-oriented variable list. `NEXT_PUBLIC_*` values are client-visible; never place secrets in them.

## Key Rotation

1. Generate a new Ed25519 key pair in the secret-management system.
2. Set the new private/public key and new `VC_ISSUER_KEY_ID`.
3. Keep the previous public key in `VC_ISSUER_PUBLIC_KEYS` until all credentials signed with it are outside the verification window.
4. Publish and verify `/api/credentials/keys`.
5. Remove retired public keys only after the retention policy permits it.

## KYC Provider Operations

Production KYC requires a legitimate provider account, signed webhook configuration, provider-side document/liveness/face-match capability, and a tested mapping from provider events to TrustDNA state transitions. The development adapter is not a verification mechanism and must never be deployed as production.

## Verification Commands

```text
npm run db:generate
npm run db:migrate:prod
npm run typecheck
npm run lint
npm test
npm run build
```

The default test command runs deterministic unit/MFA checks and reports integration/E2E tests as skipped when no real environment is configured. Run integration and E2E tests with their documented environment variables against a disposable test database and provider sandbox.

## Production-Readiness Checklist

- [ ] Production provider and credentials configured and provider sandbox flow verified.
- [ ] Secret manager configured; no private keys or API tokens in repository, image, logs, or frontend responses.
- [ ] Reviewed Prisma migration applied; backup and restore tested.
- [ ] HTTPS, HSTS, reverse proxy, trusted client-IP handling, and distributed rate limiting configured.
- [ ] KYC storage is private; malware scanning and parser validation are deployed.
- [ ] Provider webhooks have valid signatures, replay protection, idempotent processing, and state-transition monitoring.
- [ ] Credential key rotation and public JWKS discovery tested.
- [ ] Authenticated organization/IDOR, CSRF, MFA replay, refresh reuse, API-key, KYC, and revocation integration tests pass.
- [ ] Monitoring, audit-log durability, alerting, incident response, and retention policies are operational.
- [ ] Security review completed for the actual deployment topology and provider contracts.

Passing local typecheck, lint, unit tests, or build does not by itself establish production readiness.
