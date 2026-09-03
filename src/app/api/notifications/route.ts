import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/api";
import { NotificationService } from "@/server/services/notification.service";

// GET /api/notifications — list user notifications
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = await NotificationService.getUserNotifications(session.userId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/notifications — mark notification as read
export async function PATCH(req: NextRequest) {
  const session = await requireAuth(req);
  if (session instanceof NextResponse) return session;

  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    await NotificationService.markRead(body.id, session.userId);
    return NextResponse.json({ message: "Notification marked as read" }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
