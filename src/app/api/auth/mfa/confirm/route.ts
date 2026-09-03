import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { MfaService } from "@/server/services/mfa.service";
import { mfaConfirmSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const { code } = mfaConfirmSchema.parse(await req.json());
    const result = await MfaService.confirm(session.userId, code);
    return NextResponse.json({ data: result, message: "MFA enabled successfully" }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "MFA confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
