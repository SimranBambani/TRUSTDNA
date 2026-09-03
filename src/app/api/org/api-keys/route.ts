import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { OrgService } from "@/server/services/org.service";
import { createApiKeySchema } from "@/lib/validations";
import { apiError, parseBody } from "@/server/api";

// POST /api/org/api-keys — generate API key
export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  if (!session.orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  try {
    const parsed = await parseBody(req, createApiKeySchema);
    if (parsed instanceof NextResponse) return parsed;
    const result = await OrgService.generateApiKey(
      session.userId,
      session.orgId,
      parsed.data.name,
      parsed.data.scopes,
      parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined
    );

    return NextResponse.json({ data: result, message: "API key generated" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate API key";
    return apiError(message, 400);
  }
}

export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;
  if (!session.orgId) return apiError("Organization context required", 403);
  try {
    return NextResponse.json({ data: await OrgService.listApiKeys(session.userId, session.orgId) });
  } catch (err: unknown) {
    return apiError(err instanceof Error ? err.message : "Failed to list API keys", 403);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;
  if (!session.orgId) return apiError("Organization context required", 403);
  const keyId = req.nextUrl.searchParams.get("id");
  if (!keyId) return apiError("API key id is required", 422);
  try {
    return NextResponse.json({ data: await OrgService.revokeApiKey(session.userId, session.orgId, keyId) });
  } catch (err: unknown) {
    return apiError(err instanceof Error ? err.message : "Failed to revoke API key", 403);
  }
}
