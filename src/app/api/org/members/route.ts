import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { OrgService } from "@/server/services/org.service";

// GET /api/org/members — list organization members
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  if (!session.orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  try {
    const membership = await OrgService.getMembership(session.userId, session.orgId);
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const members = await OrgService.getMembers(session.orgId);
    return NextResponse.json({ data: members }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch organization members";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
