import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const TOKEN_COOKIE = "ls_token";
const PROTECTED_PREFIXES = ["/account"];
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "learnsphere-dev-secret-change-in-production"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Invalid token – fall through to redirect
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/account/:path*"],
};
