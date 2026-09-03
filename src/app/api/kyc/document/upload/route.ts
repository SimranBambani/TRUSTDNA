import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/server/api";
import { KycService, toSafeKycResponse } from "@/server/services/kyc.service";
import { rateLimit } from "@/lib/rate-limit";
import type { KYCDocumentType } from "@prisma/client";

// POST /api/kyc/document/upload — Step 2 Upload with magic byte inspection
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: "kyc-doc-upload" });
  if (!limit.success && limit.response) {
    return limit.response;
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("docType") as string || "PASSPORT").toUpperCase() as KYCDocumentType;

    if (!file) {
      return NextResponse.json({ error: "Document file is required." }, { status: 400 });
    }

    if (!["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"].includes(docType)) {
      return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await KycService.uploadDocument({
      userId: session.userId,
      docType,
      fileBuffer: buffer,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ data: toSafeKycResponse(result), message: "Document uploaded and submitted." }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Document upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
