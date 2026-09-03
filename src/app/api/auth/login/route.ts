import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { loginSchema } from "@/lib/validations";
import { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from "@/config/constants";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/auth/login — Strictly rate limited (5 req / min)
export async function POST(req: NextRequest) {
  // Apply sliding window rate limit
  const limit = rateLimit(req, { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: "auth-login" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await AuthService.login(validated, ipAddress, userAgent);

    if (result.mfaRequired) {
      return NextResponse.json({ data: result.user, mfaRequired: true, tempToken: result.tempToken }, { status: 200 });
    }

    const response = NextResponse.json(
      { data: result.user, message: "Login successful" },
      { status: 200 }
    );

    response.cookies.set(COOKIE_ACCESS_TOKEN, result.accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    response.cookies.set(COOKIE_REFRESH_TOKEN, result.refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
