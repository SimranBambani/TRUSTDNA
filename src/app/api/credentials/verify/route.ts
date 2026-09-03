import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CredentialService } from "@/server/services/credential.service";

// GET /api/credentials/verify?token=<jwt> — public verification endpoint
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing credential token parameter" }, { status: 400 });
  }

  try {
    const result = await CredentialService.verifyCredential(token);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification error";
    return NextResponse.json({ valid: false, error: message }, { status: 400 });
  }
}
