import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/cookie";

// Protección ligera: si no hay cookie de sesión, redirige a /login.
// La verificación criptográfica completa se hace en cada Server Action / página.
const PROTECTED = ["/dashboard", "/projects", "/templates"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/templates/:path*"],
};
