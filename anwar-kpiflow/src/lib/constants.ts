export const COMPANY_DOMAIN = "@anwargroup.net";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  HR_ADMIN: "HR_ADMIN",
  FINANCE_ADMIN: "FINANCE_ADMIN",
  AUDIT_ADMIN: "AUDIT_ADMIN",
  EMPLOYEE: "EMPLOYEE",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SYSTEM_ADMIN: "System Admin",
  DEPARTMENT_HEAD: "Department Head",
  HR_ADMIN: "HR Admin",
  FINANCE_ADMIN: "Finance Admin",
  AUDIT_ADMIN: "Audit Admin",
  EMPLOYEE: "Employee",
};

/** The three reviewing admin roles after the Department Head. Each sees every department. */
export const STAGE_ADMIN_ROLES: Role[] = [ROLES.HR_ADMIN, ROLES.FINANCE_ADMIN, ROLES.AUDIT_ADMIN];

// KPI statuses and their labels live with the rest of the KPI rules.
export { KPI_STATUS, STATUS_LABELS, type KpiStatus } from "./kpi";

export const USER_STATUS = {
  PENDING_SETUP: "PENDING_SETUP",
  ACTIVE: "ACTIVE",
  DEACTIVATED: "DEACTIVATED",
} as const;

export const BUSINESS_UNITS = [
  { code: "ACL", name: "Anwar Cement Limited" },
  { code: "ACSL", name: "Anwar Cement Sheet Limited" },
  { code: "AIL", name: "Anwar Ispat Limited" },
  { code: "AGL", name: "Anwar Galvanizing Limited" },
  { code: "AOPL", name: "A-One Polymer Limited" },
  { code: "ATX", name: "Anwar Textile" },
  { code: "ALM", name: "Anwar Landmark" },
  { code: "AJSM", name: "Anwar Jute Spinning Mills Limited" },
  { code: "ATECH", name: "Anwar Technologies" },
  { code: "AORG", name: "Anwar Organic" },
];

export const DEFAULT_DEPARTMENTS = [
  { code: "GA", name: "Growth Analytics" },
  { code: "MKT", name: "Marketing" },
  { code: "HR", name: "Human Resources" },
  { code: "FIN", name: "Finance & Accounts" },
  { code: "SCM", name: "Supply Chain" },
];

/** KPI card progress: the employee scores, the Department Head and HR review, Finance and Audit approve. */
export const TRACKER_STEPS = ["Score", "Review", "Approval"] as const;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

export const PASSWORD_POLICY = {
  minLength: 8,
  description: "At least 8 characters, with one uppercase letter, one lowercase letter and one number.",
  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
};

export const TOKEN_TTL_HOURS = 48;
export const SESSION_TTL_HOURS = 12;
export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

export const EVIDENCE_MAX_BYTES = 4 * 1024 * 1024; // Vercel serverless request limit is 4.5 MB
export const EVIDENCE_ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/csv",
  "text/plain",
];

/** Leaderboard performance bands (OI-11: configurable; defaults below). */
export const LEADERBOARD_BANDS = { high: 90, middle: 70 };
