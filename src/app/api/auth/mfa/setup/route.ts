import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { requireAuth } from "@/server/api";
import { MfaService } from "@/server/services/mfa.service";

export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const { otpauthUri } = await MfaService.setup(session.userId);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, { errorCorrectionLevel: "M" });
    return NextResponse.json({ data: { qrCodeDataUrl } }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "MFA setup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
