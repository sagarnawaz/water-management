import { NextResponse, type NextRequest } from "next/server";

import { roleHome } from "@/lib/constants";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

const publicRoutes = ["/login", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const role = request.cookies.get("wm-role")?.value;
  const useMockGuards = !hasSupabaseEnv();

  if (publicRoutes.includes(pathname) && role === "admin") {
    return NextResponse.redirect(new URL(roleHome.admin, request.url));
  }

  if (publicRoutes.includes(pathname) && role === "rider") {
    return NextResponse.redirect(new URL(roleHome.rider, request.url));
  }

  if (useMockGuards && pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (useMockGuards && pathname.startsWith("/rider") && role !== "rider") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
