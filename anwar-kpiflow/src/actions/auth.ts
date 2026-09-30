"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmail, appUrl } from "@/lib/email";
import { createSession, destroySession } from "@/lib/session";
import { getCurrentUser, homeFor } from "@/lib/auth";
import {
  COMPANY_DOMAIN, LOCKOUT_MINUTES, MAX_FAILED_LOGINS, PASSWORD_POLICY, ROLES, TOKEN_TTL_HOURS, USER_STATUS,
} from "@/lib/constants";

import { flatten, invalid, type ActionState } from "./form";
export type { ActionState } from "./form";

const companyEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .refine((e) => e.endsWith(COMPANY_DOMAIN), `Only ${COMPANY_DOMAIN} company email addresses can hold an account.`);

/* ------------------------------------------------------------------ */
/* FR-AUTH-01..06 — Employee self sign-up                              */
/* ------------------------------------------------------------------ */
const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: companyEmail,
  employeeId: z.string().trim().min(2, "Employee ID is required."),
  businessUnitId: z.string({ message: "Select your business unit." }).min(1, "Select your business unit."),
  departmentId: z.string({ message: "Select your department." }).min(1, "Select your department."),
});

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const d = parsed.data;

  const [bu, dept] = await Promise.all([
    db.businessUnit.findUnique({ where: { id: d.businessUnitId } }),
    db.department.findUnique({ where: { id: d.departmentId } }),
  ]);
  if (!bu) return { ok: false, errors: { businessUnitId: "Select a valid business unit." } };
  if (!dept) return { ok: false, errors: { departmentId: "Select a valid department." } };

  // FR-AUTH-04 uniqueness
  const existing = await db.user.findFirst({
    where: { OR: [{ email: d.email }, { employeeId: d.employeeId }] },
  });
  if (existing) {
    const field = existing.email === d.email ? "email" : "employeeId";
    return invalid(formData, { [field]: "An account already exists for this " + (field === "email" ? "email." : "Employee ID.") });
  }

  const user = await db.user.create({
    data: {
      fullName: d.fullName,
      email: d.email,
      employeeId: d.employeeId,
      role: ROLES.EMPLOYEE,
      status: USER_STATUS.PENDING_SETUP,
      businessUnitId: bu.id,
      departmentId: dept.id,
    },
  });

  await issueSetupLink(user.id, user.email, user.fullName, "SIGNUP", null);
  await audit(user.id, "ACCOUNT_REGISTERED", "User", user.id, { email: user.email, department: dept.name });
  redirect(`/register/sent?email=${encodeURIComponent(user.email)}`);
}

/** FR-AUTH-05/06: unique, single-use, time-limited link. */
export async function issueSetupLink(
  userId: string,
  email: string,
  fullName: string,
  type: "SIGNUP" | "INVITATION" | "RESET",
  invitedById: string | null,
) {
  // Invalidate earlier unused tokens of the same type
  await db.accountToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);
  await db.accountToken.create({ data: { token, type, userId, invitedById, expiresAt } });

  const link = appUrl(`/setup-password?token=${token}`);
  const subject =
    type === "INVITATION"
      ? "You have been invited to Anwar KPIFlow as a Department Head"
      : type === "RESET"
        ? "Reset your Anwar KPIFlow password"
        : "Set up your Anwar KPIFlow account";
  const body =
    `Hello ${fullName},\n\n` +
    (type === "INVITATION"
      ? "The Super Admin has invited you to Anwar KPIFlow as a Department Head. "
      : type === "RESET"
        ? "A password reset was requested for your account. "
        : "Your Anwar KPIFlow account has been created. ") +
    `Use the secure link below to set your password. The link is single-use and expires in ${TOKEN_TTL_HOURS} hours.\n\n${link}\n\nAnwar KPIFlow · Anwar Group of Industries`;
  await sendEmail({ to: email, subject, body, link });
  return link;
}

/* ------------------------------------------------------------------ */
/* FR-AUTH-07..10 — Password setup                                     */
/* ------------------------------------------------------------------ */
const setupSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().regex(PASSWORD_POLICY.regex, PASSWORD_POLICY.description),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "New Password and Confirm Password do not match." });

export async function setupPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = setupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const { token, password } = parsed.data;

  const t = await db.accountToken.findUnique({ where: { token }, include: { user: true } });
  if (!t || t.usedAt || t.expiresAt < new Date()) {
    return { ok: false, message: "This link has expired or was already used. Request a new one below." };
  }
  if (t.user.status === USER_STATUS.DEACTIVATED) {
    return { ok: false, message: "This account has been deactivated. Contact the Super Admin." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: t.userId }, data: { passwordHash, status: USER_STATUS.ACTIVE, failedLogins: 0, lockedUntil: null } }),
    db.accountToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
  ]);
  await audit(t.userId, t.type === "RESET" ? "PASSWORD_RESET" : "PASSWORD_SET", "User", t.userId, { tokenType: t.type });
  redirect("/login?setup=done");
}

/* ------------------------------------------------------------------ */
/* FR-AUTH-11 — Login                                                  */
/* ------------------------------------------------------------------ */
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter your company email."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, flatten(parsed.error));
  const { email, password, next } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  const generic = { ok: false, message: "Incorrect email or password." };
  if (!user || !user.passwordHash) {
    await audit(null, "LOGIN_FAILED", "User", null, { email });
    return generic;
  }
  if (user.status === USER_STATUS.DEACTIVATED) return { ok: false, message: "This account is deactivated. Contact the Super Admin." };
  if (user.status === USER_STATUS.PENDING_SETUP) return { ok: false, message: "Finish password setup from the link in your email before logging in." };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, message: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null },
    });
    await audit(user.id, "LOGIN_FAILED", "User", user.id, { locked: lock });
    return lock ? { ok: false, message: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` } : generic;
  }

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession({ uid: user.id, role: user.role });
  await audit(user.id, "LOGIN", "User", user.id);
  const safeNext = next && /^\/(?!\/)[\w\-./?=&%]*$/.test(next) && !next.startsWith("/login") ? next : null;
  redirect(safeNext ?? homeFor(user.role));
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "LOGOUT", "User", user.id);
  await destroySession();
  redirect("/login");
}

/* ------------------------------------------------------------------ */
/* OI-15 — Forgot password reuses the secure setup link                */
/* ------------------------------------------------------------------ */
export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.endsWith(COMPANY_DOMAIN)) return invalid(formData, { email: `Enter your ${COMPANY_DOMAIN} company email.` });
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status !== USER_STATUS.DEACTIVATED) {
    await issueSetupLink(user.id, user.email, user.fullName, user.status === USER_STATUS.PENDING_SETUP ? "SIGNUP" : "RESET", null);
    await audit(user.id, "PASSWORD_LINK_REQUESTED", "User", user.id);
  }
  return { ok: true, message: "If that address has an account, a secure link has been sent. Check the Outbox in this prototype." };
}

