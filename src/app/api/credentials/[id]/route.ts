import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { CredentialService } from "@/server/services/credential.service";
import { revokeCredentialSchema } from "@/lib/validations";

// GET /api/credentials/[id] — get credential detail
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  const params = await props.params;

  try {
    const credential = await CredentialService.getCredentialForActor(params.id, session);
    return NextResponse.json({ data: credential }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch credential";
    const status = message === "Credential not found" ? 404 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/credentials/[id] — revoke credential
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  const params = await props.params;

  try {
    const body = await req.json().catch(() => ({ reason: "Revoked by issuer" }));
    const validated = revokeCredentialSchema.parse(body);

    const revoked = await CredentialService.revokeCredential(
      params.id,
      session,
      validated.reason
    );

    return NextResponse.json({ data: revoked, message: "Credential revoked successfully" }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke credential";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
