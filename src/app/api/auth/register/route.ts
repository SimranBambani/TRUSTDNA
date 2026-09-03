import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/auth/register — Strictly rate limited (5 req / min)
export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: "auth-register" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await AuthService.register(validated, ipAddress, userAgent);

    return NextResponse.json(
      {
        data: result.user,
        message: "Registration successful. Please verify your email address to activate your account.",
        verificationToken: process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_AUTH_TOKENS === "true" ? result.emailVerificationToken : undefined,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
