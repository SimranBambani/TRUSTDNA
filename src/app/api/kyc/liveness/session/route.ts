import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/server/api";
import { KycService } from "@/server/services/kyc.service";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/kyc/liveness/session — Step 3 Biometric Liveness
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: "kyc-liveness" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const livenessSession = await KycService.startLivenessSession({
      userId: session.userId,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: { id: livenessSession.id, status: livenessSession.status, expiresAt: livenessSession.expiresAt }, message: "Liveness verification submitted." }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Liveness session failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
