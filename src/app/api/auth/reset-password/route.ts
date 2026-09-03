import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { resetPasswordSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/auth/reset-password — Reset password with token
export async function POST(req: NextRequest) {
  const limit = rateLimit(req, { maxRequests: 5, windowMs: 15 * 60 * 1000, keyPrefix: "auth-reset" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const body = await req.json();
    const validated = resetPasswordSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    await AuthService.resetPassword(validated.token, validated.password, ipAddress, userAgent);

    return NextResponse.json({
      message: "Password reset successful. You can now log in with your new password.",
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password reset failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
