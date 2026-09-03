import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/server/api";
import { KycService, toSafeKycResponse } from "@/server/services/kyc.service";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/kyc/submit — Execute automated risk engine decision
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: "kyc-submit" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await KycService.submitKycDecision({
      userId: session.userId,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: toSafeKycResponse(result), message: "KYC decision processed." }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "KYC decision processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
