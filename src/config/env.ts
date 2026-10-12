import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// TrustDNA — Environment Schema & Startup Guard
// ─────────────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("30d"),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hexadecimal characters"),
  MFA_TOTP_ISSUER: z.string().min(1).max(100).default("TrustDNA"),
  MFA_TOTP_WINDOW: z.coerce.number().int().min(0).max(2).default(1),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  KYC_PROVIDER: z.string().optional().default("DEVELOPMENT"),
  ALLOW_DEV_AUTH_TOKENS: z.enum(["true", "false"]).optional(),
  ONFIDO_API_TOKEN: z.string().optional(),
  ONFIDO_API_KEY: z.string().optional(),
  ONFIDO_WEBHOOK_SECRET: z.string().optional(),
  ONFIDO_BASE_URL: z.string().url().optional(),
  PERSONA_API_TOKEN: z.string().optional(),
  PERSONA_API_KEY: z.string().optional(),
  PERSONA_WEBHOOK_SECRET: z.string().optional(),
  PERSONA_BASE_URL: z.string().url().optional(),
  VC_ISSUER_PRIVATE_KEY: z.string().optional(),
  VC_ISSUER_PUBLIC_KEY: z.string().optional(),
  VC_ISSUER_KEY_ID: z.string().optional(),
  VC_ISSUER_PUBLIC_KEYS: z.string().optional(),
}).superRefine((values, context) => {
  const provider = (values.KYC_PROVIDER || "").toUpperCase();
  const isStrictProd = values.NODE_ENV === "production";

  if (isStrictProd && provider === "DEVELOPMENT") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["KYC_PROVIDER"], message: "Development KYC provider is forbidden outside development." });
  }
  if (isStrictProd && !["ONFIDO", "PERSONA"].includes(provider)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["KYC_PROVIDER"], message: "Production requires ONFIDO or PERSONA KYC provider." });
  }
  if (isStrictProd) {
    for (const name of ["VC_ISSUER_PRIVATE_KEY", "VC_ISSUER_PUBLIC_KEY", "VC_ISSUER_KEY_ID"] as const) {
      if (!values[name]) context.addIssue({ code: z.ZodIssueCode.custom, path: [name], message: `${name} is required in production.` });
    }
  }
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables configuration");
  }
  return parsed.data;
}

export const env = validateEnv();
