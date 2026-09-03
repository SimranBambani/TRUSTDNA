import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { OrgService } from "@/server/services/org.service";
import { createOrgSchema } from "@/lib/validations";

// POST /api/org — create a new organization
export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    const validated = createOrgSchema.parse(body);

    const org = await OrgService.createOrganization(session.userId, validated);
    return NextResponse.json({ data: org, message: "Organization created successfully" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// GET /api/org — list organizations for the authenticated user
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const organizations = await OrgService.getUserOrganizations(session.userId);
    return NextResponse.json({ data: organizations }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch organizations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
