import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { COOKIE_ACCESS_TOKEN } from "@/config/constants";
import type { AuthSession } from "@/types";
import { rateLimit } from "@/lib/rate-limit";
import { OrgService } from "@/server/services/org.service";
import { prisma } from "@/lib/db";

/** Extract and verify session from incoming request cookies */
export async function getSession(req: NextRequest): Promise<AuthSession | null> {
  try {
    const accessToken = req.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    if (!accessToken) {
      return null;
    }
    
    const session = await verifyAccessToken(accessToken);
    if (!session) return null;
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { status: true, deletedAt: true, role: true } });
    if (!user || user.deletedAt || ["SUSPENDED", "BANNED"].includes(user.status)) return null;
    const membership = session.orgId ? null : await prisma.orgMembership.findFirst({
      where: { userId: session.userId, isActive: true },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    return { ...session, role: user.role, orgId: session.orgId || membership?.organizationId };
  } catch {
    return null;
  }
}

/** Require authentication — returns 401 if not authenticated */
export async function requireAuth(req: NextRequest): Promise<AuthSession | NextResponse> {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/** Authenticate an integration request without exposing the supplied key. */
export async function requireApiKey(req: NextRequest, requiredScope?: string) {
  const limit = rateLimit(req, { maxRequests: 120, windowMs: 60 * 1000, keyPrefix: "api-key" });
  if (!limit.success) return limit.response;

  const authorization = req.headers.get("authorization");
  const suppliedKey = authorization?.match(/^Bearer (tdna_live_[a-f0-9]{48})$/)?.[1]
    ?? req.headers.get("x-api-key")?.match(/^tdna_live_[a-f0-9]{48}$/)?.[0];
  if (!suppliedKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return await OrgService.authenticateApiKey(suppliedKey, requiredScope);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** Require a specific role */
export async function requireRole(
  req: NextRequest,
  role: "PLATFORM_ADMIN" | "ORG_ADMIN"
): Promise<AuthSession | NextResponse> {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== role && session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/** Standard success response */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, status }, { status });
}

/** Standard error response */
export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message, status }, { status });
}

/** Validate request body with Zod schema */
export async function parseBody<T>(
  req: NextRequest,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { flatten: () => unknown } } }
): Promise<{ data: T } | NextResponse> {
  try {
    const body   = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error?.flatten() },
        { status: 422 }
      );
    }
    return { data: result.data! };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
