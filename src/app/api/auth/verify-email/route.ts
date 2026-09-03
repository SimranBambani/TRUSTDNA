import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { verifyEmailSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/auth/verify-email — Verify email address token
export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { maxRequests: 5, windowMs: 15 * 60 * 1000, keyPrefix: "auth-verify-email" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const body = await req.json();
    const validated = verifyEmailSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    await AuthService.verifyEmail(validated.token, ipAddress, userAgent);

    return NextResponse.json(
      { message: "Email address verified successfully! You can now log in." },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Email verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
