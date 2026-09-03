import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/server/api";
import { KycService, toSafeKycResponse } from "@/server/services/kyc.service";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/kyc/start — Initialize or get active KYC session
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { maxRequests: 10, windowMs: 60 * 1000, keyPrefix: "kyc-start" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const kycSession = await KycService.getOrCreateKycSession(session.userId);
    return NextResponse.json({ data: toSafeKycResponse(kycSession) }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start KYC session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
