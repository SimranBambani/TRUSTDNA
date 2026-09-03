import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Authoritative Zod Validation Schemas (Strict Mode)
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address").max(320).trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    firstName: z.string().min(1).max(100).trim(),
    lastName: z.string().min(1).max(100).trim(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email().trim().toLowerCase(),
    password: z.string().min(1),
    deviceFingerprint: z.string().max(255).optional(),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().min(1, "Verification token is required"),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: z.string().email().trim().toLowerCase(),
  })
  .strict();

export const mfaVerifySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, "MFA code must be 6 digits").optional(),
    recoveryCode: z.string().regex(/^[A-Z0-9-]{8,32}$/).optional(),
    tempToken: z.string().min(1),
  })
  .strict()
  .refine((value) => Boolean(value.code || value.recoveryCode), { message: "MFA code or recovery code is required" });

export const mfaConfirmSchema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
export const mfaDisableSchema = z.object({ password: z.string().min(1), code: z.string().regex(/^\d{6}$/) }).strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email().trim().toLowerCase(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
  })
  .strict();

// ── Credential ────────────────────────────────────────────────────────────

export const issueCredentialSchema = z
  .object({
    subjectUserId: z.string().uuid(),
    credentialType: z.string().min(1).max(100),
    claims: z.record(z.unknown()),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();

export const verifyCredentialSchema = z
  .object({
    token: z.string().min(1),
  })
  .strict();

export const revokeCredentialSchema = z
  .object({
    reason: z.string().min(1).max(500).trim(),
  })
  .strict();

// ── Identity / KYC ────────────────────────────────────────────────────────

export const submitKycSchema = z
  .object({
    requestType: z.enum(["BASIC_KYC", "ENHANCED_KYC", "ADDRESS_VERIFICATION"]),
    provider: z.enum(["INTERNAL", "ONFIDO", "JUMIO", "PERSONA"]).default("INTERNAL"),
  })
  .strict();

// ── Organization ──────────────────────────────────────────────────────────

export const createOrgSchema = z
  .object({
    name: z.string().min(2).max(255).trim(),
    slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
    domain: z.string().max(253).optional(),
    website: z.string().url().optional(),
    description: z.string().max(1000).optional(),
  })
  .strict();

export const inviteMemberSchema = z
  .object({
    email: z.string().email().trim().toLowerCase(),
    role: z.enum(["ADMIN", "MEMBER", "VERIFIER", "VIEWER"]),
  })
  .strict();

export const createApiKeySchema = z
  .object({
    name: z.string().min(1).max(255).trim(),
    scopes: z.array(z.string().min(1).max(100)).max(20).default([]),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();

// ── Pagination ────────────────────────────────────────────────────────────

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type IssueCredentialInput = z.infer<typeof issueCredentialSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
