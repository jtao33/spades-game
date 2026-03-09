import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers middleware for all routes.
 * Adds essential security headers to protect against common web vulnerabilities.
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Socket server URL for CSP
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "https://spades-ws.jtphillyserver.com";
  const socketHost = new URL(socketUrl).host;

  // Content Security Policy - Prevents XSS attacks
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'", // Required for Framer Motion
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' https://${socketHost} wss://${socketHost}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspDirectives);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  return response;
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|imgs/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
