import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { MfaService } from "@/server/services/mfa.service";
import { mfaDisableSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const input = mfaDisableSchema.parse(await req.json());
    await MfaService.disable(session.userId, input.password, input.code);
    return NextResponse.json({ message: "MFA disabled successfully" }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "MFA disable failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
