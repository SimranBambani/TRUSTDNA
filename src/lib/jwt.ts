import crypto from "node:crypto";
import { SignJWT, jwtVerify, decodeProtectedHeader, exportJWK, importPKCS8, importSPKI } from "jose";
import type { JwtPayload, AuthSession } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — JWT Crypto Engine
// ─────────────────────────────────────────────────────────────────────────────

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return new TextEncoder().encode(secret);
}

/** Generate Access Token (15 min TTL) */
export async function generateAccessToken(payload: Omit<JwtPayload, "iat" | "exp" | "jti">): Promise<string> {
  const jti = `jti_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("trustdna")
    .setJti(jti)
    .sign(getJwtSecret());
}

/** Generate Refresh Token (30 day TTL) */
export async function generateRefreshToken(userId: string): Promise<{ token: string; jti: string }> {
  const jti = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const token = await new SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setIssuer("trustdna")
    .setJti(jti)
    .sign(getJwtSecret());

  return { token, jti };
}

/** Verify Access Token */
export async function verifyAccessToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "trustdna",
    });

    if (!payload.sub) return null;

    return {
      userId: payload.sub as string,
      email: (payload.email as string) || "",
      role: (payload.role as string) || "USER",
      orgId: (payload.orgId as string) || undefined,
      trustTier: (payload.trustTier as string) || "BRONZE",
      sessionId: (payload.jti as string) || "",
    };
  } catch {
    return null;
  }
}

/** Verify Refresh Token */
export async function verifyRefreshToken(token: string): Promise<{ userId: string; jti: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "trustdna",
    });

    if (!payload.sub || payload.type !== "refresh") return null;

    return {
      userId: payload.sub as string,
      jti: (payload.jti as string) || "",
    };
  } catch {
    return null;
  }
}

export async function generateMfaChallenge(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, type: "mfa-challenge" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer("trustdna")
    .sign(getJwtSecret());
}

export async function verifyMfaChallenge(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: "trustdna" });
    return payload.type === "mfa-challenge" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

function getPem(name: "VC_ISSUER_PRIVATE_KEY" | "VC_ISSUER_PUBLIC_KEY") {
  const value = process.env[name]?.replace(/\\n/g, "\n");
  if (!value) throw new Error(`${name} is required for credential cryptography`);
  return value;
}

function getCredentialKeyId() {
  const keyId = process.env.VC_ISSUER_KEY_ID;
  if (!keyId) throw new Error("VC_ISSUER_KEY_ID is required for credential cryptography");
  return keyId;
}

async function getVerificationKeys() {
  const keys = new Map<string, Awaited<ReturnType<typeof importSPKI>>>();
  keys.set(getCredentialKeyId(), await importSPKI(getPem("VC_ISSUER_PUBLIC_KEY"), "EdDSA"));
  const previousKeys = process.env.VC_ISSUER_PUBLIC_KEYS;
  if (previousKeys) {
    let parsed: Record<string, string>;
    try { parsed = JSON.parse(previousKeys) as Record<string, string>; } catch { throw new Error("VC_ISSUER_PUBLIC_KEYS must be valid JSON"); }
    for (const [kid, pem] of Object.entries(parsed)) keys.set(kid, await importSPKI(pem.replace(/\\n/g, "\n"), "EdDSA"));
  }
  return keys;
}

/** Sign a VC-JWT using the configured issuer private key. */
export async function signCredentialJwt(credentialPayload: Record<string, unknown>): Promise<string> {
  const privateKey = await importPKCS8(getPem("VC_ISSUER_PRIVATE_KEY"), "EdDSA");

  return new SignJWT({ ...credentialPayload })
    .setProtectedHeader({ alg: "EdDSA", kid: getCredentialKeyId(), typ: "JWT+VC" })
    .setIssuedAt()
    .setJti(`vc_${crypto.randomUUID()}`)
    .sign(privateKey);
}

/** Verify a VC-JWT using the public key selected by its protected-header kid. */
export async function verifyCredentialJwt(token: string): Promise<{ valid: boolean; payload?: Record<string, unknown>; error?: string }> {
  try {
    const { kid, alg } = decodeProtectedHeader(token);
    if (alg !== "EdDSA" || !kid) return { valid: false, error: "Unsupported or missing credential key identifier" };
    const key = (await getVerificationKeys()).get(kid);
    if (!key) return { valid: false, error: "Unknown credential key identifier" };
    const { payload } = await jwtVerify(token, key);
    return { valid: true, payload: payload as Record<string, unknown> };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid signature";
    return { valid: false, error: errorMessage };
  }
}

/** Public JWKS document for external credential verifiers. */
export async function getCredentialJwks() {
  const keys = await getVerificationKeys();
  const jwks = await Promise.all([...keys.entries()].map(async ([kid, key]) => ({
    ...(await exportJWK(key)), kid, alg: "EdDSA", use: "sig",
  })));
  return { keys: jwks };
}
