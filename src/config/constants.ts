// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — App-wide Constants
// ─────────────────────────────────────────────────────────────────────────────

export const APP_NAME    = "TrustDNA";
export const APP_VERSION = "1.0.0";
export const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── JWT ───────────────────────────────────────────────────────────────────
export const JWT_ACCESS_EXPIRY  = "15m";
export const JWT_REFRESH_EXPIRY = "30d";
export const JWT_ISSUER         = "trustdna";

// ── Trust Score ───────────────────────────────────────────────────────────
export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_MAX = 1000;

export const TRUST_TIER_THRESHOLDS = {
  BRONZE:   0,
  SILVER:   300,
  GOLD:     600,
  PLATINUM: 850,
} as const;

export const TRUST_EVENT_WEIGHTS: Record<string, number> = {
  KYC_VERIFIED:         200,
  KYC_EXPIRED:         -150,
  KYC_REJECTED:        -100,
  CREDENTIAL_ISSUED:     50,
  CREDENTIAL_REVOKED:   -75,
  EMAIL_VERIFIED:        30,
  PHONE_VERIFIED:        30,
  MFA_ENABLED:           40,
  ORG_VERIFIED:         100,
  LOGIN_SUCCESS:          2,
  LOGIN_ANOMALY:        -20,
  FRAUD_FLAG_CONFIRMED: -300,
  FRAUD_FLAG_DISMISSED:   50,
  PEER_ENDORSEMENT:       15,
  INACTIVITY_DECAY:       -5,
};

export const TRUST_DECAY_RATES: Record<string, number> = {
  IDENTITY:   0.001,
  CREDENTIAL: 0.002,
  BEHAVIOR:   0.010,
  FRAUD:      0.003,
  SOCIAL:     0.005,
};

// ── Rate Limits ───────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  LOGIN:              { requests: 10,  windowMs: 15 * 60 * 1000 },
  REGISTER:           { requests: 5,   windowMs: 60 * 60 * 1000 },
  KYC_SUBMIT:         { requests: 3,   windowMs: 24 * 60 * 60 * 1000 },
  CREDENTIAL_ISSUE:   { requests: 50,  windowMs: 60 * 60 * 1000 },
  CREDENTIAL_VERIFY:  { requests: 100, windowMs: 60 * 1000 },
  DEFAULT:            { requests: 200, windowMs: 60 * 1000 },
} as const;

// ── Pagination ────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE     = 100;

// ── Cookie Names ──────────────────────────────────────────────────────────
export const COOKIE_ACCESS_TOKEN  = "tdna_access";
export const COOKIE_REFRESH_TOKEN = "tdna_refresh";

// ── Storage ───────────────────────────────────────────────────────────────
export const STORAGE_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const STORAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// ── KYC ───────────────────────────────────────────────────────────────────
export const KYC_SESSION_TTL_DAYS = 30;
export const KYC_MAX_ATTEMPTS     = 3;

// ── Navigation ────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { label: "Dashboard",      href: "/dashboard",              icon: "LayoutDashboard" },
  { label: "Trust Score",    href: "/trust",                  icon: "ShieldCheck" },
  { label: "Identity",       href: "/identity",               icon: "Fingerprint" },
  { label: "Credentials",    href: "/credentials",            icon: "Award" },
  { label: "Organization",   href: "/org",                    icon: "Building2" },
  { label: "Notifications",  href: "/notifications",          icon: "Bell" },
  { label: "Settings",       href: "/settings",               icon: "Settings" },
] as const;
