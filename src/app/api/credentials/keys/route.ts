import { NextResponse } from "next/server";
import { CredentialService } from "@/server/services/credential.service";

export async function GET() {
  try {
    return NextResponse.json(await CredentialService.getPublicKeys(), {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ error: "Credential public keys are unavailable" }, { status: 503 });
  }
}