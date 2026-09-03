import argon2 from "argon2";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Argon2id Password Hashing & Legacy Verification Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash password using Argon2id with OWASP-recommended security parameters:
 * - Type: Argon2id (hybrid resistant against side-channel and GPU attacks)
 * - Memory: 64 MB (65536 KiB)
 * - Time iterations: 3
 * - Parallelism: 4 threads
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify password against stored hash.
 * Supports both Argon2id hashes ($argon2id$) and legacy bcrypt hashes ($2a$, $2b$).
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    if (hash.startsWith("$argon2")) {
      return await argon2.verify(hash, password);
    }
    
    // Legacy bcrypt fallback for backward compatibility
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      return await bcrypt.compare(password, hash);
    }

    return false;
  } catch {
    return false;
  }
}
