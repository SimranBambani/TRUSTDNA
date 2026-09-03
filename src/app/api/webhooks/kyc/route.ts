import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// POST /api/webhooks/kyc — receive external KYC provider webhooks
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "This webhook endpoint has been retired. Use the configured provider webhook endpoint." },
    { status: 410 }
  );
}
