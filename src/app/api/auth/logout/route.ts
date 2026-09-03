import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from "@/config/constants";

// POST /api/auth/logout
export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    await AuthService.logout(refreshToken);

    const response = NextResponse.json({ message: "Logged out successfully" }, { status: 200 });

    // Clear authentication cookies
    response.cookies.delete(COOKIE_ACCESS_TOKEN);
    response.cookies.delete(COOKIE_REFRESH_TOKEN);

    return response;
  } catch {
    return NextResponse.json({ message: "Logged out" }, { status: 200 });
  }
}
