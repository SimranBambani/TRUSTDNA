import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { mfaVerifySchema } from "@/lib/validations";
import { AuthService } from "@/server/services/auth.service";
import { MfaService } from "@/server/services/mfa.service";
import { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from "@/config/constants";

// POST /api/auth/mfa/verify — verify TOTP/MFA code
export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(req, { maxRequests: 5, windowMs: 15 * 60 * 1000, keyPrefix: "mfa-verify" });
    if (!limit.success && limit.response) return limit.response;
    const input = mfaVerifySchema.parse(await req.json());
    const userId = await AuthService.consumeMfaChallenge(input.tempToken);
    if (!userId) return NextResponse.json({ error: "Invalid or expired MFA challenge" }, { status: 401 });
    await MfaService.verify(userId, input.code, input.recoveryCode);
    const result = await AuthService.completeMfaLogin(userId, req.headers.get("x-forwarded-for") || "127.0.0.1", req.headers.get("user-agent") || undefined);
    const response = NextResponse.json({ data: result.user, message: "MFA verification successful" });
    response.cookies.set(COOKIE_ACCESS_TOKEN, result.accessToken!, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60, path: "/" });
    response.cookies.set(COOKIE_REFRESH_TOKEN, result.refreshToken!, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60, path: "/" });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "MFA verification failed";
    return NextResponse.json({ error: message }, { status: message === "Invalid MFA code" ? 401 : 400 });
  }
}
