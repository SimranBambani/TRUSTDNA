import pino from "pino";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Structured Security Logger with Pino & Sensitive Field Redaction
// ─────────────────────────────────────────────────────────────────────────────

const redactFields = [
  // Auth
  "password",
  "passwordHash",
  "confirmPassword",
  "accessToken",
  "refreshToken",
  "token",
  "secret",
  "claims",
  "authorization",
  "cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  // KYC PII — never log raw personal data
  "dateOfBirth",
  "nationalId",
  "documentNumber",
  "mrzLine1",
  "mrzLine2",
  "encryptedFirstName",
  "encryptedLastName",
  "encryptedDateOfBirth",
  "encryptedNationality",
  "kycEncryptionKey",
  "KYC_ENCRYPTION_KEY",
  // Provider secrets
  "apiToken",
  "webhookSecret",
  "ONFIDO_API_TOKEN",
  "ONFIDO_WEBHOOK_SECRET",
];

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: redactFields,
    censor: "[REDACTED_SENSITIVE_DATA]",
  },
  base: {
    env: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function logSecurityEvent(event: {
  action: string;
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILURE" | "SUSPICIOUS";
  metadata?: Record<string, unknown>;
}) {
  logger.info({
    type: "SECURITY_AUDIT",
    ...event,
  });
}
