import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { resendVerificationSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/auth/resend-verification — Resend verification email token
export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { maxRequests: 3, windowMs: 15 * 60 * 1000, keyPrefix: "auth-resend-verify" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const body = await req.json();
    const validated = resendVerificationSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await AuthService.resendVerification(validated.email, ipAddress, userAgent);

    return NextResponse.json({
      message: "If an unverified account with that email exists, a verification link has been sent.",
      verificationToken: process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_AUTH_TOKENS === "true" ? result.verificationToken : undefined,
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
