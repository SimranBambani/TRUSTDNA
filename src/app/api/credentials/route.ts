import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { CredentialService } from "@/server/services/credential.service";
import { issueCredentialSchema } from "@/lib/validations";

// GET /api/credentials — list subject's credentials
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = await CredentialService.getSubjectCredentials(session.userId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/credentials — issue a new credential (org admin/verifier only)
export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  if (!session.orgId) {
    return NextResponse.json({ error: "Organization context required to issue credentials" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validated = issueCredentialSchema.parse(body);

    const credential = await CredentialService.issueCredential(
      session.userId,
      session.orgId,
      validated
    );

    return NextResponse.json({ data: credential, message: "Credential issued successfully" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to issue credential";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
