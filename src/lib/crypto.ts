import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Cryptographic & Hashing Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Hash token for database storage (SHA-256) */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Compare a token with a stored digest without leaking timing information. */
export function verifyToken(token: string, expectedHash: string): boolean {
  const actualHash = hashToken(token);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** Generate secure random token string */
export function generateRandomToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/** Compute HMAC signature for webhooks */
export function computeHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/** Verify HMAC signature */
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expected = computeHmacSignature(payload, secret);
  // Ensure equal-length buffers to prevent length-based timing attacks
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

// ────────────────────────────────────────────────────────────────────────────────
// AES-256-GCM Field-Level Encryption (for KYC PII at rest)
// Format:  <iv-hex>:<authTag-hex>:<ciphertext-hex>
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * @param plaintext - UTF-8 string to encrypt
 * @param keyHex   - 64-char hex string (32 bytes). Load from KYC_ENCRYPTION_KEY env var.
 * @returns        - "<iv>:<authTag>:<ciphertext>" all hex-encoded
 */
export function encryptField(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) throw new Error("Encryption key must be exactly 32 bytes (64 hex chars)");
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt an AES-256-GCM encrypted field.
 * @param ciphertext - "<iv>:<authTag>:<ciphertext>" hex-encoded string
 * @param keyHex     - 64-char hex string (32 bytes)
 * @returns          - original UTF-8 plaintext
 */
export function decryptField(ciphertext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) throw new Error("Encryption key must be exactly 32 bytes (64 hex chars)");
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted field format");
  const [ivHex, authTagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/**
 * Generate a cryptographically random object ID for storage paths.
 * Prevents guessable or user-supplied filenames from being used as storage paths.
 */
export function generateObjectId(): string {
  return crypto.randomUUID();
}
