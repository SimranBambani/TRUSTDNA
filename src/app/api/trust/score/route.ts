import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { TrustService } from "@/server/services/trust.service";

// GET /api/trust/score — get authenticated user's trust score
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = await TrustService.getUserTrustData(session.userId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch score";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
