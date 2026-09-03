import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiError, requireAuth } from "@/server/api";
import { OrgService } from "@/server/services/org.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;
  if (!session.orgId) return apiError("Organization context required", 403);

  try {
    const { id } = await params;
    return NextResponse.json({ data: await OrgService.revokeApiKey(session.userId, session.orgId, id) });
  } catch (err: unknown) {
    return apiError(err instanceof Error ? err.message : "Failed to revoke API key", 403);
  }
}