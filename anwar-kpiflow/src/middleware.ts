import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/register", "/setup-password", "/forgot-password", "/dev/outbox"];
const COOKIE = "kpiflow_session";

/** Screens each role may open (Section 6.1). Pages re-check on the server; this just makes wrong-role visits redirect instantly. */
const EMPLOYEE_ONLY_BLOCK = ["/dashboard", "/pending-requests", "/leaderboard", "/admin"];
const HEAD_BLOCK = ["/admin"];
const SUPER_ADMIN_BLOCK = ["/my-kpi", "/performance"];
const SYSTEM_ADMIN_ALLOW = ["/admin/department-heads", "/admin/employees", "/admin/kpis", "/my-kpi/", "/profile", "/api", "/dev"];

function homeFor(role: string) {
  if (role === "EMPLOYEE") return "/my-kpi";
  if (role === "SYSTEM_ADMIN") return "/admin/employees";
  return "/dashboard";
}

/** Edge access guard: every app screen requires an authenticated session (6.4, NFR-04). */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret"));
      role = typeof payload.role === "string" ? payload.role : null;
    } catch {
      role = null;
    }
  }
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(COOKIE);
    return res;
  }

  const blocked =
    (role === "EMPLOYEE" && EMPLOYEE_ONLY_BLOCK.some((p) => pathname.startsWith(p))) ||
    (role === "DEPARTMENT_HEAD" && HEAD_BLOCK.some((p) => pathname.startsWith(p))) ||
    (role === "SUPER_ADMIN" && SUPER_ADMIN_BLOCK.some((p) => pathname === p)) ||
    (role === "SYSTEM_ADMIN" && pathname !== "/" && !SYSTEM_ADMIN_ALLOW.some((p) => pathname.startsWith(p)));
  if (blocked && !pathname.startsWith("/api")) {
    const url = req.nextUrl.clone();
    url.pathname = homeFor(role);
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/|api/health).*)"],
};
