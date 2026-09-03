import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireRole } from "@/server/api";
import { prisma } from "@/lib/db";

// GET /api/admin — platform stats dashboard API
export async function GET(req: NextRequest) {
  const session = await requireRole(req, "PLATFORM_ADMIN");
  if (session instanceof NextResponse) return session;

  try {
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } });
    const totalOrgs = await prisma.organization.count({ where: { deletedAt: null } });
    const totalCredentials = await prisma.credential.count({ where: { status: "ACTIVE" } });
    const pendingKyc = await prisma.verificationRequest.count({ where: { status: "PENDING" } });

    return NextResponse.json({
      data: {
        totalUsers,
        totalOrgs,
        totalCredentials,
        pendingKyc,
        systemStatus: "HEALTHY",
      },
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch admin metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
