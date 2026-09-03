# TrustDNA

<div align="center">

![TrustDNA Banner](https://img.shields.io/badge/TrustDNA-Digital%20Identity%20Platform-6366f1?style=for-the-badge&logo=shield&logoColor=white)

[![Next.js](https://img.shields.io/badge/Next.js%2015-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2016-316192?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**A secure digital identity and trust platform with automated KYC, verifiable credentials, and trust scoring.**

</div>

---

## What is TrustDNA?

TrustDNA is a full-stack identity verification and trust platform built to demonstrate how real-world KYC (Know Your Customer), digital credential systems, and trust scoring work in fintech and identity verification products.

It implements:
- **Secure authentication** with Argon2id, TOTP MFA, and refresh token rotation
- **Automated KYC pipeline** — 7-step state machine from personal info to automated risk decision
- **Ed25519 Verifiable Credentials** — cryptographically signed JWTs with public JWKS verification
- **Trust Score Engine** — exponential decay scoring across identity, credential, and behavior dimensions
- **Organization API key management** — with hashed storage, scopes, and lifecycle management
- **Append-only audit logs** for every security-sensitive action

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │  Auth Flow │  │ KYC Module │  │  Credential Engine  │ │
│  └─────┬──────┘  └─────┬──────┘  └────────┬───────────┘ │
│        │               │                   │             │
│  ┌─────▼───────────────▼───────────────────▼───────────┐ │
│  │              Service Layer (12 services)              │ │
│  │  Auth · MFA · KYC · Trust · Credential · Org · Fraud │ │
│  └─────────────────────┬─────────────────────────────── ┘ │
│                        │ Prisma ORM                       │
└────────────────────────┼─────────────────────────────────┘
                         │
               ┌─────────▼──────────┐
               │   PostgreSQL 16    │
               │  20+ tables · UUID │
               │  Indexed · Audited │
               └────────────────────┘
```

---

## Features

### 🔐 Authentication
- Registration with DNS MX email validation and disposable domain blocking
- Argon2id password hashing (with automatic bcrypt → Argon2id migration on login)
- HttpOnly cookie sessions with refresh token rotation
- Forgot password / reset password with hashed time-limited tokens
- Account enumeration protection on all auth endpoints

### 🛡️ Multi-Factor Authentication (TOTP)
- TOTP setup with QR code generation (compatible with Google Authenticator / Authy)
- AES-256-GCM encrypted TOTP secret storage in database
- 10 single-use recovery codes (SHA-256 hashed)
- Re-authentication required before disabling MFA
- MFA challenge tokens with 5-minute expiry and one-time consumption

### 🪪 Automated KYC Pipeline
```
NOT_STARTED → KYC_STARTED → PERSONAL_INFO_COMPLETED
→ DOCUMENT_UPLOADED → LIVENESS_PENDING
→ VERIFIED | NEEDS_MANUAL_REVIEW | REJECTED
```
- Magic byte file inspection (PNG, JPEG, PDF only — blocks MIME spoofing)
- Server-side risk scoring engine (0–100 score across 7 signal types)
- Automated decisions: Low risk → VERIFIED, Medium → NEEDS_MANUAL_REVIEW, High → REJECTED
- Terminal state immutability — verified records cannot be tampered with
- Append-only KYC audit log for every state transition
- Provider abstraction layer (ONFIDO / PERSONA / Development)

### 📜 Verifiable Credentials
- Ed25519 signing via `jose` library (PKCS8 private key / SPKI public key)
- `kid`-based key rotation — old credentials remain verifiable through key history
- Public JWKS endpoint for external verifiers
- Revocation with trust score impact
- IDOR protection — only subject/issuer/org members can access a credential

### 📊 Trust Score Engine
- Exponential decay formula: `score × e^(-decayRate × ageInDays)`
- Sub-scores: Identity (max 350) + Credential (max 350) + Behavior (max 300) − Fraud Penalty
- Tiers: BRONZE → SILVER → GOLD → PLATINUM
- Events: KYC_VERIFIED, EMAIL_VERIFIED, MFA_ENABLED, CREDENTIAL_ISSUED, FRAUD_FLAG, etc.

### 🏢 Organization & API Keys
- Organization creation with owner membership and initial trust score
- API key generation with `tdna_live_` prefix, SHA-256 hashing, scopes, and expiry
- Raw key shown exactly once at creation — never stored in plaintext
- Revocation, prefix-based lookup with timing-safe comparison

### 🔒 Security Defenses
| Defense | Implementation |
|---|---|
| Password hashing | Argon2id (memory-hard) |
| Token storage | SHA-256 hashed (never plaintext) |
| Session cookies | HttpOnly, SameSite=Lax, Secure in prod |
| File uploads | Magic byte binary inspection |
| Rate limiting | Sliding window per IP/endpoint |
| Origin validation | Middleware-level CSRF protection |
| KYC state machine | Terminal state immutability |
| Webhook verification | HMAC secret comparison |
| Audit trail | Append-only PostgreSQL table |
| IDOR | Actor authorization on every resource access |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Auth Crypto | `jose` (Ed25519, HS256), Argon2id |
| MFA | `otpauth` (TOTP RFC 6238) |
| Validation | Zod |
| State | Zustand |
| UI | Tailwind CSS, Lucide React |
| Logging | Pino (structured JSON) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16

### Installation

```bash
# Clone the repo
git clone https://github.com/SimranBambani/TRUSTDNA.git
cd TRUSTDNA

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in all required values in .env
```

### Environment Setup

```bash
# Generate Ed25519 keys for credential signing
node -e "
const { generateKeyPairSync } = require('crypto');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
console.log('VC_ISSUER_PRIVATE_KEY=' + JSON.stringify(privateKey.export({ format: 'pem', type: 'pkcs8' })));
console.log('VC_ISSUER_PUBLIC_KEY=' + JSON.stringify(publicKey.export({ format: 'pem', type: 'spki' })));
"

# Generate ENCRYPTION_KEY (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Database Setup

```bash
# Apply schema
npm run db:push

# Or for production with migrations
npm run db:migrate:prod
```

### Run

```bash
# Development
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Tests
npm run test:unit

# Production build
npm run build
npm start
```

---

## API Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Register with email verification |
| `/api/auth/verify-email` | POST | Confirm email token |
| `/api/auth/login` | POST | Login (returns MFA challenge if enabled) |
| `/api/auth/mfa/setup` | POST | Get TOTP QR code |
| `/api/auth/mfa/confirm` | POST | Confirm TOTP + get recovery codes |
| `/api/auth/mfa/verify` | POST | Complete MFA login |
| `/api/auth/mfa/disable` | POST | Disable MFA (requires password + TOTP) |
| `/api/auth/logout` | POST | Revoke session |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/kyc/start` | POST | Initialize KYC session |
| `/api/kyc/personal-info` | POST | Submit Step 1 personal info |
| `/api/kyc/document/upload` | POST | Upload identity document (magic byte validated) |
| `/api/kyc/liveness/session` | POST | Biometric liveness check |
| `/api/kyc/submit` | POST | Trigger automated risk engine |
| `/api/kyc/status` | GET | Get current KYC state |
| `/api/credentials` | GET/POST | List or issue credentials |
| `/api/credentials/verify` | POST | Publicly verify a credential JWT |
| `/api/credentials/keys` | GET | Public JWKS for external verifiers |
| `/api/trust/score` | GET | Get trust score and events |
| `/api/org` | GET/POST | Organization management |
| `/api/org/api-keys` | GET/POST | API key management |
| `/api/org/api-keys/[id]` | DELETE | Revoke API key |

Full API documentation: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## KYC Flow

```
User → POST /api/kyc/start
     → POST /api/kyc/personal-info   (Name, DOB, Nationality)
     → POST /api/kyc/document/upload (Passport/ID — magic byte inspected)
     → POST /api/kyc/liveness/session (Biometric liveness)
     → POST /api/kyc/submit

Server-Side Risk Engine evaluates:
  ✓ Name match (fuzzy Levenshtein) vs OCR extracted name
  ✓ DOB match vs OCR extracted DOB
  ✓ Document authenticity score
  ✓ Document expiry check
  ✓ Face match score
  ✓ Liveness verification
  ✓ Velocity (repeated attempts)

Decision:
  Risk Score 0–24  → VERIFIED         (automatic)
  Risk Score 25–74 → NEEDS_MANUAL_REVIEW
  Risk Score 75+   → REJECTED         (automatic)
```

---

## Production Configuration Required

Before deploying to production, you **must**:

1. **Set `KYC_PROVIDER`** to `ONFIDO` or `PERSONA` and provide API credentials
2. **Configure an email provider** (Resend / SendGrid) — no email sending is implemented yet
3. **Set up Supabase Storage** or equivalent for KYC document storage
4. **Use Redis** for distributed rate limiting (current rate limiter is in-memory, resets on restart)
5. **Generate fresh secrets** for `JWT_SECRET`, `ENCRYPTION_KEY`, `VC_ISSUER_PRIVATE_KEY`
6. **Set `STRICT_PROD_CHECKS=true`** to enable production environment validation

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, verify pages
│   ├── (dashboard)/     # Dashboard, trust, identity, credentials pages
│   ├── (admin)/         # Admin panel
│   └── api/             # All API route handlers
│       ├── auth/        # Auth, MFA, refresh, logout
│       ├── kyc/         # KYC pipeline routes
│       ├── credentials/ # VC issuance and verification
│       ├── trust/       # Trust score and events
│       └── org/         # Organization and API key management
├── server/
│   └── services/        # Business logic (12 services)
│       ├── auth.service.ts
│       ├── mfa.service.ts
│       ├── kyc.service.ts
│       ├── kyc-risk.service.ts
│       ├── credential.service.ts
│       ├── trust.service.ts
│       ├── org.service.ts
│       └── audit.service.ts
├── lib/
│   ├── jwt.ts           # JWT + Ed25519 credential crypto
│   ├── crypto.ts        # AES-256-GCM, SHA-256 token hashing
│   ├── argon2.ts        # Password hashing
│   ├── rate-limit.ts    # Sliding window rate limiter
│   └── kyc/
│       ├── file-security.ts      # Magic byte inspection
│       ├── provider.factory.ts   # KYC provider selection
│       └── development.provider.ts
├── config/
│   └── env.ts           # Zod environment validation
├── middleware.ts         # Auth protection + CSRF origin check
tests/
├── unit/                # 8 passing unit tests
├── integration/         # API integration tests
└── e2e/                 # End-to-end workflow tests
prisma/
└── schema.prisma        # 20+ models, 810 lines
```

---

## Known Limitations

- **Email delivery not implemented** — verification tokens are returned in API response (dev only)
- **KYC provider is mocked in development** — use `KYC_PROVIDER=DEVELOPMENT` for local testing
- **File storage is not connected** — document paths are generated but not uploaded to Supabase
- **Rate limiting is in-memory** — resets on server restart; use Redis for production
- **No migration files** — schema managed via `prisma db push`; add Prisma migrations before team/production use

---

## Security

Please read [SECURITY.md](SECURITY.md) before using or deploying this project.

To report a vulnerability, open a private GitHub security advisory — do not file a public issue.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built by <a href="https://github.com/SimranBambani">Simran Bambani</a> · 3rd Year Computer Engineering Student
</div>
