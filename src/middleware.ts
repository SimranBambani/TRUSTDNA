import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).origin !== request.nextUrl.origin) {
          return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
      }
    }
  }

  // Allow public API routes (health, credential verify)
  if (pathname.startsWith("/api/health") || pathname.startsWith("/api/credentials/verify")) {
    return NextResponse.next();
  }

  // Allow webhook endpoints
  if (pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("tdna_access")?.value;

  // ── Not authenticated: redirect protected routes to /login ───────────────
  if (!accessToken) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/trust") ||
      pathname.startsWith("/identity") ||
      pathname.startsWith("/credentials") ||
      pathname.startsWith("/org") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/admin")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // ── Authenticated: redirect away from login/register to /dashboard ─────
  if (AUTH_ROUTES.some((r) => pathname === r)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
