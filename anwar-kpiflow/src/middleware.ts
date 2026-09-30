import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/register", "/setup-password", "/forgot-password", "/dev/outbox"];
const COOKIE = "kpiflow_session";

/** Edge access guard: every app screen requires an authenticated session (6.4, NFR-04). Role checks happen server-side per page. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret"));
      valid = true;
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(COOKIE);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/health).*)"],
};
