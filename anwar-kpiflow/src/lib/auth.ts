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

/** Access guard (Section 17.1): resolves the signed-in user or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { businessUnit: true, department: true },
  });
  if (!user || user.status !== USER_STATUS.ACTIVE) return null;
  return user as CurrentUser;
}

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
  return "/dashboard";
}

export function isSuperAdmin(u: { role: string }) {
  return u.role === ROLES.SUPER_ADMIN;
}
export function isDeptHead(u: { role: string }) {
  return u.role === ROLES.DEPARTMENT_HEAD;
}
export function canReview(u: { role: string }) {
  return u.role === ROLES.SUPER_ADMIN || u.role === ROLES.DEPARTMENT_HEAD;
}

/**
 * Department scoping (Section 6.2 / 17.3): can this user see this KPI?
 * - Owner sees own KPI
 * - Department Head sees KPIs of employees in their department, plus KPIs routed to them
 * - Super Admin sees all
 */
export function canViewKpi(
  user: CurrentUser,
  kpi: { ownerId: string; approverId: string; owner: { departmentId: string | null; role: string } },
): boolean {
  if (isSuperAdmin(user)) return true;
  if (kpi.ownerId === user.id) return true;
  if (isDeptHead(user)) {
    if (kpi.approverId === user.id) return true;
    if (kpi.owner.departmentId && kpi.owner.departmentId === user.departmentId && kpi.owner.role === ROLES.EMPLOYEE)
      return true;
  }
  return false;
}

/** Can this user act (approve/adjust/return/reject/edit/delete) on this KPI? BR-10: never on own KPI. */
export function canDecideKpi(
  user: CurrentUser,
  kpi: { ownerId: string; approverId: string; owner: { departmentId: string | null; role: string } },
): boolean {
  if (kpi.ownerId === user.id) return false;
  if (isSuperAdmin(user)) return true;
  if (isDeptHead(user)) {
    return (
      kpi.approverId === user.id ||
      (!!kpi.owner.departmentId && kpi.owner.departmentId === user.departmentId && kpi.owner.role === ROLES.EMPLOYEE)
    );
  }
  return false;
}
