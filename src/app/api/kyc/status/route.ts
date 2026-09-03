import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/server/api";
import { KycService } from "@/server/services/kyc.service";

// GET /api/kyc/status — Fetch user KYC status
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kycSession = await KycService.getOrCreateKycSession(session.userId);

    // Sanitize output (do not expose internal fraud signals or secret raw hashes)
    const sanitized = {
      id: kycSession.id,
      status: kycSession.status,
      currentStep: kycSession.currentStep,
      decision: kycSession.decision,
      startedAt: kycSession.startedAt,
      completedAt: kycSession.completedAt,
      personalIdentity: kycSession.personalIdentity ? {
        firstName: kycSession.personalIdentity.firstName,
        lastName: kycSession.personalIdentity.lastName,
        dateOfBirth: kycSession.personalIdentity.dateOfBirth,
        nationality: kycSession.personalIdentity.nationality,
        countryOfResidence: kycSession.personalIdentity.countryOfResidence,
      } : null,
      documentsCount: kycSession.documents?.length || 0,
      hasLivenessCompleted: (kycSession.livenessSessions?.length || 0) > 0,
    };

    return NextResponse.json({ data: sanitized }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch KYC status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
