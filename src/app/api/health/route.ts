import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { status: "ok", service: "TrustDNA API", version: "1.0.0", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
