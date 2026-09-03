import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { prisma } from "@/lib/db";

// GET /api/trust/events — get trust event ledger timeline
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const events = await prisma.trustEvent.findMany({
      where: { userId: session.userId },
      orderBy: { occurredAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ data: events }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
