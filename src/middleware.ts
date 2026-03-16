import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Rate limiting store (in-memory for dev, use Redis in prod)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// All routes that belong to the dashboard (route group)
// These match the actual URL paths: /dashboard, /cases, /billing, /ai, /documents, /hearings, /sync, /settings
function isDashboardRoute(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/cases" ||
    pathname.startsWith("/cases/") ||
    pathname === "/documents" ||
    pathname.startsWith("/documents/") ||
    pathname === "/hearings" ||
    pathname.startsWith("/hearings/") ||
    pathname === "/ai" ||
    pathname.startsWith("/ai/") ||
    pathname === "/billing" ||
    pathname.startsWith("/billing/") ||
    pathname === "/sync" ||
    pathname.startsWith("/sync/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  );
}

// Cron routes authenticated by CRON_SECRET header — skip session check
function isCronRoute(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const pathname = nextUrl.pathname;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  // Cron routes — let through (they auth via CRON_SECRET header in the route handler)
  if (isCronRoute(pathname)) {
    return NextResponse.next();
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const apiLimit = pathname.startsWith("/api/auth") ? 20 : 100;
    if (!rateLimit(ip, apiLimit, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email");

  const isDashboard = isDashboardRoute(pathname);
  const isPortal = pathname.startsWith("/portal");
  const isAdmin = pathname.startsWith("/admin");

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Protect all dashboard routes — redirect to login if not authenticated
  if (isDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Subscription gate for dashboard routes
  if (isDashboard && isLoggedIn) {
    const status = (session.user as any).subscriptionStatus as string | undefined | null;
    const role = (session.user as any).role;

    // Only block access when subscription is explicitly EXPIRED or CANCELLED
    // TRIAL, ACTIVE, undefined, null all get through freely
    const isGated = status === "EXPIRED" || status === "CANCELLED";

    // Allow billing and settings even when gated
    const isExempt =
      pathname === "/billing" ||
      pathname.startsWith("/billing/") ||
      pathname === "/settings" ||
      pathname.startsWith("/settings/");

    if (role !== "ADMIN" && isGated && !isExempt) {
      return NextResponse.redirect(new URL("/billing", nextUrl));
    }
  }

  // Admin routes — must be logged in as ADMIN
  if (isAdmin) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = (session?.user as any)?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  // Client portal requires CLIENT role
  if (isPortal && !isLoggedIn) {
    return NextResponse.redirect(new URL("/portal/login", nextUrl));
  }

  if (isPortal && isLoggedIn) {
    const role = (session.user as any).role;
    if (role !== "CLIENT" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set("X-Request-ID", crypto.randomUUID());
  return response;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/cases/:path*",
    "/cases",
    "/documents/:path*",
    "/documents",
    "/hearings/:path*",
    "/hearings",
    "/ai/:path*",
    "/ai",
    "/billing/:path*",
    "/billing",
    "/sync/:path*",
    "/sync",
    "/settings/:path*",
    "/settings",
    "/portal/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/signup",
    "/onboarding",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/api/:path*",
  ],
};
