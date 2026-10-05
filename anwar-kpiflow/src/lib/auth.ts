import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { readSession } from "./session";
import { ROLES, type Role, USER_STATUS } from "./constants";

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  role: Role;
  designation: string | null;
  corporatePhone: string | null;
  status: string;
  businessUnitId: string | null;
  departmentId: string | null;
  businessUnit: { id: string; name: string; code: string } | null;
  department: { id: string; name: string; code: string } | null;
};

/** Access guard (Section 17.1): resolves the signed-in user or null. Memoised per request (React cache) so the layout, page and actions share one lookup. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { businessUnit: true, department: true },
  });
  if (!user || user.status !== USER_STATUS.ACTIVE) return null;
  return user as CurrentUser;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: string): string {
  if (role === ROLES.EMPLOYEE) return "/my-kpi";
  if (role === ROLES.SYSTEM_ADMIN) return "/admin/employees";
  return "/dashboard";
}

export function isSuperAdmin(u: { role: string }) {
  return u.role === ROLES.SUPER_ADMIN;
}
export function isSystemAdmin(u: { role: string }) {
  return u.role === ROLES.SYSTEM_ADMIN;
}
/** Super Admin and System Admin: invite Department Heads, add and remove employees. */
export function isAdmin(u: { role: string }) {
  return u.role === ROLES.SUPER_ADMIN || u.role === ROLES.SYSTEM_ADMIN;
}
export function isDeptHead(u: { role: string }) {
  return u.role === ROLES.DEPARTMENT_HEAD;
}
// Who may open or decide a KPI is decided in lib/kpi.ts (canViewKpi, canActOn), next to the approval chain itself.
