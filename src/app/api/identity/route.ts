import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { IdentityService } from "@/server/services/identity.service";

// GET /api/identity — get current user's identity profile
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = await IdentityService.getIdentityProfile(session.userId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/identity — submit KYC verification
export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  return NextResponse.json(
    { error: "This KYC submission endpoint has been retired. Use the verified KYC workflow." },
    { status: 410 }
  );
}
