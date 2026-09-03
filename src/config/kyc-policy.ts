// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Centralised KYC Policy Configuration
// All thresholds, limits, and rules are defined here.
// Never hardcode KYC policy values in services or API routes.
// ─────────────────────────────────────────────────────────────────────────────

// ── Age Policy ────────────────────────────────────────────────────────────────
export const KYC_AGE_POLICY = {
  /** Minimum age in years to pass KYC */
  minimumAgeYears: 18,
  /** Maximum age in years (sanity check) */
  maximumAgeYears: 120,
} as const;

// ── Document Policy ───────────────────────────────────────────────────────────
export const KYC_DOCUMENT_POLICY = {
  /** Maximum upload size in bytes */
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB

  /** Allowed MIME types (server-side validation, not trusted from client) */
  allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"] as string[],

  /** Magic byte signatures used for server-side file type detection */
  magicBytes: {
    "image/jpeg": [
      [0xff, 0xd8, 0xff, 0xe0],
      [0xff, 0xd8, 0xff, 0xe1],
      [0xff, 0xd8, 0xff, 0xdb],
      [0xff, 0xd8, 0xff, 0xee],
    ],
    "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  } as Record<string, number[][]>,

  /** Allowed document types */
  allowedDocumentTypes: ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"] as const,

  /** Maximum document validity age (documents expiring within this window trigger MEDIUM risk) */
  expiryWarningDays: 90,
} as const;

// ── Liveness Session Policy ───────────────────────────────────────────────────
export const KYC_LIVENESS_POLICY = {
  /** How long a liveness session token is valid before it expires */
  sessionTtlMinutes: 15,
  /** Minimum confidence score for liveness to pass (0-100) */
  minimumLivenessConfidence: 70,
  /** Minimum face match score to pass (0-100) */
  minimumFaceMatchScore: 70,
} as const;

// ── Retry Policy ──────────────────────────────────────────────────────────────
export const KYC_RETRY_POLICY = {
  /** Maximum number of KYC attempts before permanent rejection */
  maxAttempts: 3,
  /** Cooldown period in hours between retry attempts */
  retryCoulddownHours: 24,
} as const;

// ── Risk Scoring ──────────────────────────────────────────────────────────────
/** KYC risk score ranges. 0 = lowest risk, 100 = highest risk. */
export const KYC_RISK_THRESHOLDS = {
  /** Below this score: automated VERIFIED flow */
  lowRiskMax: 25,
  /** Below this score: additional check / NEEDS_MANUAL_REVIEW */
  mediumRiskMax: 59,
  /** Above mediumRiskMax: REJECTED or NEEDS_MANUAL_REVIEW per policy */
} as const;

/**
 * Risk signal weights. Positive = risk increase, negative = risk reduction.
 * All values are on a 0-100 scale contribution.
 */
export const KYC_RISK_SIGNAL_WEIGHTS = {
  // Document signals
  documentAuthenticityFailed: 40,
  documentExpired: 25,
  documentExpiringSoon: 5,
  documentExtractionFailed: 20,
  documentTamperingDetected: 50,
  documentCountryHighRisk: 15,

  // Biometric signals
  faceMismatch: 35,
  livenessFailure: 40,
  faceExtractionFailed: 20,

  // Behavioural signals
  previousKycFailedAttempt: 10, // per attempt, additive
  multipleAccountsDetected: 30,
  suspiciousIpActivity: 15,
  deviceFingerprintRisk: 10,

  // Provider risk signals
  providerHighRiskFlag: 30,
  providerMediumRiskFlag: 15,

  // Positive signals (risk reduction)
  documentAuthentic: -5,
  livenessPass: -5,
  facematchPass: -5,
} as const;

// ── Decision Engine Policy ────────────────────────────────────────────────────
/**
 * Decision engine rules.
 * If all MANDATORY conditions pass AND risk score <= lowRiskMax → VERIFIED
 * If any CRITICAL condition fails → REJECTED
 * Otherwise → NEEDS_MANUAL_REVIEW
 */
export const KYC_DECISION_POLICY = {
  /** Conditions that are MANDATORY for VERIFIED outcome */
  mandatoryConditions: [
    "documentAuthentic",
    "documentNotExpired",
    "requiredFieldsExtracted",
    "livenessPass",
    "facematchPass",
    "personalInfoMatchesDocument",
  ] as string[],

  /** Conditions that IMMEDIATELY cause REJECTED (no manual review) */
  criticalRejectConditions: [
    "documentTamperingDetected",
    "livenessSpoof",
    "multipleAccountsDetected",
  ] as string[],

  /** Fuzzy name match minimum score (0-1) to consider names matching */
  nameMatchMinScore: 0.75,

  /** DOB must match exactly between personal info and document */
  strictDobMatch: true,
} as const;

// ── Data Retention Policy ─────────────────────────────────────────────────────
export const KYC_RETENTION_POLICY = {
  /** Days to retain identity documents in storage after KYC decision */
  documentRetentionDays: 90,
  /** Days to retain liveness session references */
  livenessRetentionDays: 30,
  /** Days to retain KYC personal info (encrypted) after decision */
  personalInfoRetentionDays: parseInt(process.env.KYC_RETENTION_DAYS ?? "365", 10),
  /** Webhook idempotency records retained for replay prevention */
  webhookIdempotencyDays: 90,
  /** Audit events are never deleted (regulatory requirement) */
  auditRetentionDays: null as null,
} as const;

// ── Provider Configuration ────────────────────────────────────────────────────
export const KYC_PROVIDER_CONFIG = {
  /** Active provider: 'dev' | 'onfido' | 'persona' */
  provider: (process.env.KYC_PROVIDER ?? "") as "dev" | "onfido" | "persona",

  onfido: {
    apiToken: process.env.ONFIDO_API_TOKEN ?? "",
    webhookSecret: process.env.ONFIDO_WEBHOOK_SECRET ?? "",
    baseUrl: process.env.ONFIDO_BASE_URL ?? "https://api.onfido.com/v3.6",
  },

  persona: {
    apiToken: process.env.PERSONA_API_KEY ?? "",
    webhookSecret: process.env.PERSONA_WEBHOOK_SECRET ?? "",
    baseUrl: process.env.PERSONA_BASE_URL ?? "https://withpersona.com/api/v1",
  },
} as const;

// ── Storage Configuration ─────────────────────────────────────────────────────
export const KYC_STORAGE_CONFIG = {
  /** Private bucket for KYC documents — MUST NOT be a public bucket */
  bucket: process.env.KYC_STORAGE_BUCKET ?? "trustdna-kyc-documents",
  /** Signed URL TTL in seconds (only used when absolutely required) */
  signedUrlTtlSeconds: 300, // 5 minutes
} as const;
