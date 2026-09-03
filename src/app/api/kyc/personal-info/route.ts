import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/server/api";
import { KycService, toSafeKycResponse } from "@/server/services/kyc.service";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).trim(),
  lastName: z.string().min(1, "Last name is required").max(100).trim(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  nationality: z.string().length(2, "Country code must be 2 letters").toUpperCase().trim(),
  countryOfResidence: z.string().length(2, "Country code must be 2 letters").toUpperCase().trim(),
}).strict();

// POST /api/kyc/personal-info — Submit Step 1 details
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: "kyc-personal-info" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const body = await req.json();
    const validated = personalInfoSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await KycService.submitPersonalInfo({
      userId: session.userId,
      ...validated,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: toSafeKycResponse(result), message: "Personal information saved." }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save personal information";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
