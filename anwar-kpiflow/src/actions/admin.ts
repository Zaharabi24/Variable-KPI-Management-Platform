"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { COMPANY_DOMAIN, ROLES, ROLE_LABELS, STAGE_ADMIN_ROLES, USER_STATUS, type Role } from "@/lib/constants";
import { issueSetupLink } from "./auth";
import { flatten, invalid, type ActionState } from "./form";

const companyEmail = z
  .string().trim().toLowerCase().email("Enter a valid email address.")
  .refine((e) => e.endsWith(COMPANY_DOMAIN), `Only ${COMPANY_DOMAIN} addresses can hold an account.`);

/* FR-SA-02/03/04 — Invite Department Head */
const inviteSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: companyEmail,
  employeeId: z.string().trim().min(2, "Employee ID is required."),
  businessUnitId: z.string({ message: "Select a business unit." }).min(1, "Select a business unit."),
  role: z.string().trim().min(2, "Role / designation is required."),
  departmentId: z.string({ message: "Select a department." }).min(1, "Select a department."),
});

export async function inviteDepartmentHeadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;
  const dup = await db.user.findFirst({ where: { OR: [{ email: d.email }, { employeeId: d.employeeId }] } });
  if (dup) return invalid(formData, { [dup.email === d.email ? "email" : "employeeId"]: "An account already exists with this value." });

  const user = await db.user.create({
    data: {
      fullName: d.fullName, email: d.email, employeeId: d.employeeId, role: ROLES.DEPARTMENT_HEAD, designation: d.role,
      status: USER_STATUS.PENDING_SETUP, businessUnitId: d.businessUnitId, departmentId: d.departmentId,
    },
  });
  await issueSetupLink(user.id, user.email, user.fullName, "INVITATION", admin.id);
  await audit(admin.id, "DEPARTMENT_HEAD_INVITED", "User", user.id, { email: user.email, departmentId: d.departmentId });
  revalidatePath("/admin/department-heads");
  return { ok: true, message: `Invitation sent to ${user.fullName}. The setup link is in the Outbox.` };
}

/** HR, Finance and Audit Admins hold approval authority across every department, so only the Super Admin may create or change them. */
function mayManage(admin: { role: string }, target: { role: string }) {
  return !(STAGE_ADMIN_ROLES as string[]).includes(target.role) || admin.role === ROLES.SUPER_ADMIN;
}

function revalidateUsers() {
  revalidatePath("/admin/employees");
  revalidatePath("/admin/department-heads");
  revalidatePath("/admin/hr-admins");
  revalidatePath("/admin/finance-admins");
  revalidatePath("/admin/audit-admins");
}

/* Invite an HR Admin, Finance Admin or Audit Admin — Super Admin only. The invitee sets their own password through a single-use link. */
const inviteStageAdminSchema = inviteSchema.omit({ role: true, departmentId: true }).extend({ designation: z.string().trim().max(80).optional() });

export async function inviteStageAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(ROLES.SUPER_ADMIN);
  const role = String(formData.get("adminRole") ?? "") as Role;
  if (!STAGE_ADMIN_ROLES.includes(role)) return { ok: false, message: "Unknown admin role." };
  const parsed = inviteStageAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;
  const dup = await db.user.findFirst({ where: { OR: [{ email: d.email }, { employeeId: d.employeeId }] } });
  if (dup) return invalid(formData, { [dup.email === d.email ? "email" : "employeeId"]: "An account already exists with this value." });

  const user = await db.user.create({
    data: {
      fullName: d.fullName, email: d.email, employeeId: d.employeeId, role, designation: d.designation || ROLE_LABELS[role],
      status: USER_STATUS.PENDING_SETUP, businessUnitId: d.businessUnitId, departmentId: null,
    },
  });
  await issueSetupLink(user.id, user.email, user.fullName, "INVITATION", admin.id);
  await audit(admin.id, `${role}_INVITED`, "User", user.id, { email: user.email });
  revalidateUsers();
  return { ok: true, message: `Invitation sent to ${user.fullName}. The setup link is in the Outbox.` };
}

/* FR-SA-08 — Resend invitation */
export async function resendInvitationAction(userId: string) {
  const admin = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== USER_STATUS.PENDING_SETUP || !mayManage(admin, user)) return;
  await issueSetupLink(user.id, user.email, user.fullName, user.role === ROLES.DEPARTMENT_HEAD || (STAGE_ADMIN_ROLES as string[]).includes(user.role) ? "INVITATION" : "SIGNUP", admin.id);
  await audit(admin.id, "INVITATION_RESENT", "User", user.id);
  revalidateUsers();
}

/* FR-SA-06 — Add employee */
const addEmployeeSchema = inviteSchema.omit({ role: true }).extend({ designation: z.string().trim().max(80).optional() });

export async function addEmployeeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const parsed = addEmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;
  const dup = await db.user.findFirst({ where: { OR: [{ email: d.email }, { employeeId: d.employeeId }] } });
  if (dup) return invalid(formData, { [dup.email === d.email ? "email" : "employeeId"]: "An account already exists with this value." });
  const user = await db.user.create({
    data: {
      fullName: d.fullName, email: d.email, employeeId: d.employeeId, role: ROLES.EMPLOYEE, designation: d.designation || null,
      status: USER_STATUS.PENDING_SETUP, businessUnitId: d.businessUnitId, departmentId: d.departmentId,
    },
  });
  await issueSetupLink(user.id, user.email, user.fullName, "SIGNUP", admin.id);
  await audit(admin.id, "EMPLOYEE_ADDED", "User", user.id, { departmentId: d.departmentId });
  revalidatePath("/admin/employees");
  return { ok: true, message: `${user.fullName} added. The setup link is in the Outbox.` };
}

/* FR-SA-06 — Move employee to another department / business unit */
export async function moveUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const userId = String(formData.get("userId"));
  const departmentId = String(formData.get("departmentId") ?? "");
  const businessUnitId = String(formData.get("businessUnitId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role === ROLES.SUPER_ADMIN || !mayManage(admin, user)) return { ok: false, message: "User not found." };
  const before = { departmentId: user.departmentId, businessUnitId: user.businessUnitId };
  await db.user.update({ where: { id: userId }, data: { departmentId: departmentId || user.departmentId, businessUnitId: businessUnitId || user.businessUnitId } });
  await audit(admin.id, "USER_MOVED", "User", userId, { before, after: { departmentId, businessUnitId } });
  revalidateUsers();
  return { ok: true, message: "User moved. Existing KPIs stay with the department that received them." };
}

/* FR-SA-06 — Deactivate / reactivate */
export async function setUserStatusAction(userId: string, status: "ACTIVE" | "DEACTIVATED") {
  const admin = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.id === admin.id || user.role === ROLES.SUPER_ADMIN || user.role === ROLES.SYSTEM_ADMIN || !mayManage(admin, user)) return;
  if (status === "ACTIVE" && !user.passwordHash) return; // still pending setup
  await db.user.update({ where: { id: userId }, data: { status } });
  await audit(admin.id, status === "ACTIVE" ? "USER_REACTIVATED" : "USER_DEACTIVATED", "User", userId);
  revalidateUsers();
}

/* FR-SA-01 — Delete user (historical KPI records remain for audit, 6.4) */
export async function deleteUserAction(userId: string) {
  const admin = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { ownedKpis: true, approvingKpis: true, decisions: true, versions: true } } },
  });
  if (!user || user.id === admin.id || user.role === ROLES.SUPER_ADMIN || user.role === ROLES.SYSTEM_ADMIN || !mayManage(admin, user)) return;
  if (Object.values(user._count).some((n) => n > 0)) {
    // Keep history: deactivate instead of hard delete (KPI records and every decision stay attributable)
    await db.user.update({ where: { id: userId }, data: { status: USER_STATUS.DEACTIVATED } });
    await audit(admin.id, "USER_DEACTIVATED", "User", userId, { reason: "delete requested; KPI history retained" });
  } else {
    await db.user.delete({ where: { id: userId } });
    await audit(admin.id, "USER_DELETED", "User", userId, { email: user.email });
  }
  revalidateUsers();
}

/* FR-SA-07 — Organisation lists */
export async function addDepartmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(ROLES.SUPER_ADMIN);
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (name.length < 2 || code.length < 2) return invalid(formData, { name: "Name and code are required." });
  const dup = await db.department.findFirst({ where: { OR: [{ name }, { code }] } });
  if (dup) return { ok: false, errors: { name: "A department with this name or code already exists." } };
  const dept = await db.department.create({ data: { name, code } });
  await audit(admin.id, "DEPARTMENT_CREATED", "Department", dept.id, { name, code });
  revalidatePath("/admin/organisation");
  return { ok: true, message: `Department "${name}" created.` };
}

export async function addBusinessUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(ROLES.SUPER_ADMIN);
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (name.length < 2 || code.length < 2) return invalid(formData, { name: "Name and code are required." });
  const dup = await db.businessUnit.findFirst({ where: { OR: [{ name }, { code }] } });
  if (dup) return { ok: false, errors: { name: "A business unit with this name or code already exists." } };
  const bu = await db.businessUnit.create({ data: { name, code } });
  await audit(admin.id, "BUSINESS_UNIT_CREATED", "BusinessUnit", bu.id, { name, code });
  revalidatePath("/admin/organisation");
  return { ok: true, message: `Business unit "${name}" created.` };
}

export async function renameOrgAction(kind: "department" | "businessUnit", id: string, name: string) {
  const admin = await requireRole(ROLES.SUPER_ADMIN);
  const clean = name.trim();
  if (clean.length < 2) return;
  if (kind === "department") await db.department.update({ where: { id }, data: { name: clean } });
  else await db.businessUnit.update({ where: { id }, data: { name: clean } });
  await audit(admin.id, "ORG_RENAMED", kind === "department" ? "Department" : "BusinessUnit", id, { name: clean });
  revalidatePath("/admin/organisation");
}

export async function deleteOrgAction(kind: "department" | "businessUnit", id: string) {
  const admin = await requireRole(ROLES.SUPER_ADMIN);
  const count = await db.user.count({ where: kind === "department" ? { departmentId: id } : { businessUnitId: id } });
  if (count > 0) return { ok: false, message: "Move its users first; this list entry still has users." };
  if (kind === "department") await db.department.delete({ where: { id } });
  else await db.businessUnit.delete({ where: { id } });
  await audit(admin.id, "ORG_DELETED", kind === "department" ? "Department" : "BusinessUnit", id);
  revalidatePath("/admin/organisation");
  return { ok: true };
}

/* Super Admin edit of any user's profile (FR-SA-01, FR-PRO-03) */
const editUserSchema = z.object({
  userId: z.string(),
  fullName: z.string().trim().min(2, "Full name is required."),
  employeeId: z.string().trim().min(2, "Employee ID is required."),
  designation: z.string().trim().max(80).optional(),
  corporatePhone: z.string().trim().max(30).optional(),
});
export async function editUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const parsed = editUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;
  const target = await db.user.findUnique({ where: { id: d.userId } });
  if (!target || !mayManage(admin, target)) return { ok: false, message: "User not found." };
  const dup = await db.user.findFirst({ where: { employeeId: d.employeeId, NOT: { id: d.userId } } });
  if (dup) return invalid(formData, { employeeId: "Another account already uses this Employee ID." });
  await db.user.update({
    where: { id: d.userId },
    data: { fullName: d.fullName, employeeId: d.employeeId, designation: d.designation || null, corporatePhone: d.corporatePhone || null },
  });
  await audit(admin.id, "USER_EDITED", "User", d.userId, { fullName: d.fullName, employeeId: d.employeeId });
  revalidateUsers();
  return { ok: true, message: "User updated." };
}

