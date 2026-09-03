import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { FraudService } from "@/server/services/fraud.service";

// GET /api/fraud — admin endpoint to fetch open fraud signals
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const alerts = session.role === "PLATFORM_ADMIN"
      ? await FraudService.getOpenAlerts()
      : await FraudService.getUserAlerts(session.userId);
    return NextResponse.json({ data: alerts }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch fraud alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
