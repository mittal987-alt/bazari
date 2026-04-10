import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const pathname = req.nextUrl.pathname;

  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/api/auth",
  ];

  const isPublic = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route)
  );

  // 🔓 Public routes
  if (isPublic) {
    // Logged-in users should not see login/register
    if (token && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard/buyer", req.url));
    }
    return NextResponse.next();
  }

  // 🔒 Protected routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/create-ad",
    "/ads/:path*",
    "/saved",
    "/chats",
    "/profile",
  ],
};
