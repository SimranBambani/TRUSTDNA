import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from "@/config/constants";

// POST /api/auth/refresh
export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token missing" }, { status: 401 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const { accessToken, newRefreshToken } = await AuthService.refreshToken(refreshToken, ipAddress, userAgent);

    const response = NextResponse.json({ message: "Token refreshed" }, { status: 200 });

    response.cookies.set(COOKIE_ACCESS_TOKEN, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    response.cookies.set(COOKIE_REFRESH_TOKEN, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token refresh failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
