import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getKycProvider } from "@/lib/kyc/provider.factory";
import { logSecurityEvent } from "@/lib/logger";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

// POST /api/kyc/provider/webhook — Provider Webhook Callback Endpoint
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headersObject: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObject[key.toLowerCase()] = value;
    });

    const provider = getKycProvider();
    const verification = await provider.verifyWebhook(headersObject, rawBody);

    if (!verification.isValid) {
      logSecurityEvent({
        action: "KYC_WEBHOOK_FORGERY_ATTEMPT",
        status: "SUSPICIOUS",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const providerEventId = verification.eventId || crypto.createHash("sha256").update(rawBody).digest("hex");
    try {
      await prisma.kYCWebhookEvent.create({
        data: { provider: provider.providerName, providerEventId },
      });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
      throw error;
    }

    logSecurityEvent({
      action: "KYC_WEBHOOK_RECEIVED",
      status: "SUCCESS",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ received: true, eventType: verification.eventType }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
