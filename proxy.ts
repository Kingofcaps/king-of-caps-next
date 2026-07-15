import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_HOST = "admin.kingofcaps.bj";
const PUBLIC_HOSTS = new Set(["kingofcaps.bj", "www.kingofcaps.bj"]);

function requestHostname(request: NextRequest) {
  return (request.headers.get("host") ?? request.nextUrl.hostname)
    .split(":")[0]
    .toLowerCase();
}

export function proxy(request: NextRequest) {
  const hostname = requestHostname(request);
  const { pathname } = request.nextUrl;

  if (PUBLIC_HOSTS.has(hostname) && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return NextResponse.redirect("https://kingofcaps.bj");
  }

  if (hostname === ADMIN_HOST && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|static|images|favicon.ico|.*\\..*).*)"],
};
