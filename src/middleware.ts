import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect API Routes from unauthorized external scans / unauthenticated requests
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");

    // Allow requests originating from the same host or local development
    const isSameHost = (referer && host && referer.includes(host)) || (origin && host && origin.includes(host));
    const isDev = process.env.NODE_ENV !== "production";

    // For state-modifying requests (POST, PUT, DELETE), enforce host validation
    if (request.method !== "GET" && !isSameHost && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access: Origin not verified" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
