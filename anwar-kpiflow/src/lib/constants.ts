export const COMPANY_DOMAIN = "@anwargroup.net";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  EMPLOYEE: "EMPLOYEE",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  DEPARTMENT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
};

export const KPI_STATUS = {
  SUBMITTED: "SUBMITTED",
  RETURNED: "RETURNED",
  APPROVED: "APPROVED",
  ADJUSTED: "ADJUSTED",
  REJECTED: "REJECTED",
} as const;
export type KpiStatus = (typeof KPI_STATUS)[keyof typeof KPI_STATUS];

export const STATUS_LABELS: Record<KpiStatus, string> = {
  SUBMITTED: "Submitted",
  RETURNED: "Returned",
  APPROVED: "Approved",
  ADJUSTED: "Adjusted",
  REJECTED: "Rejected",
};

export const KPI_CATEGORY = {
  PROJECT: "PROJECT",
  PEOPLE_CULTURE: "PEOPLE_CULTURE",
} as const;
export type KpiCategory = (typeof KPI_CATEGORY)[keyof typeof KPI_CATEGORY];

export const CATEGORY_LABELS: Record<KpiCategory, string> = {
  PROJECT: "Project KPI",
  PEOPLE_CULTURE: "People & Culture KPI",
};

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

export const TRACKER_STEPS = ["Target", "Actual", "Evidence", "Score", "Review", "Approval"] as const;

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

export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
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
