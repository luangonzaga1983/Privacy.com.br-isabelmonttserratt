import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV !== "production";

// CSP: imagens do QR vêm como data:URI; em dev o Next usa eval + websocket.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "upgrade-insecure-requests",
].join("; ");

export function middleware() {
  const res = NextResponse.next();
  const h = res.headers;

  h.set("Content-Security-Policy", csp);
  h.set("X-Frame-Options", "DENY"); // anti-clickjacking
  h.set("X-Content-Type-Options", "nosniff"); // anti MIME-sniffing
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  h.set("X-DNS-Prefetch-Control", "off");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return res;
}

// Aplica em tudo, menos assets estáticos do Next.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
