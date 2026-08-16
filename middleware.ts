import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/health",
  "/player",
  "/library",
  "/api/media/stream",
  "/api/media/config",
  "/api/media/files",
  "/api/media/pick-folder",
  "/api/media/lan-info",
  "/api/media/search-imdb",
  "/api/media/music-neural",
  "/api/watch",
  "/api/catalog",
  "/api/search",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("watch-advisor-session")?.value;
  if (token) {
    try {
      const secret = new TextEncoder().encode(
        process.env.AUTH_SECRET || "development-only-change-this-secret",
      );
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // Fall through to login.
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
