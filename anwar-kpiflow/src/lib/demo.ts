/**
 * Demo accounts seeded by prisma/seed.ts — one per required user type, plus every employee so that
 * each department's queue, dashboard and leaderboard can be exercised from the employee side too.
 * Every account listed here is ACTIVE and can sign in immediately.
 */
export const DEMO_PASSWORDS = {
  SUPER_ADMIN: "Admin@2026",
  DEPARTMENT_HEAD: "Head@2026",
  EMPLOYEE: "User@2026",
} as const;

export type DemoAccount = {
  role: "Super Admin" | "Department Head" | "Employee";
  name: string;
  email: string;
  password: string;
  employeeId: string;
  department: string;
  designation: string;
};

const SA = DEMO_PASSWORDS.SUPER_ADMIN;
const DH = DEMO_PASSWORDS.DEPARTMENT_HEAD;
const EMP = DEMO_PASSWORDS.EMPLOYEE;

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "Super Admin", name: "Sarwar Hossain", email: "superadmin@anwargroup.net", password: SA, employeeId: "AG-0001", department: "All departments", designation: "Group Head of Performance" },

  { role: "Department Head", name: "Nasrin Islam", email: "nasrin.islam@anwargroup.net", password: DH, employeeId: "AG-0101", department: "Growth Analytics", designation: "Head of Growth Analytics" },
  { role: "Department Head", name: "Kamal Hasan", email: "kamal.hasan@anwargroup.net", password: DH, employeeId: "AG-0102", department: "Growth Analytics", designation: "Deputy Head (2nd head of the same department)" },
  { role: "Department Head", name: "Farhana Rahman", email: "farhana.rahman@anwargroup.net", password: DH, employeeId: "AG-0201", department: "Human Resources", designation: "Head of Human Resources" },
  { role: "Department Head", name: "Imran Chowdhury", email: "imran.chowdhury@anwargroup.net", password: DH, employeeId: "AG-0301", department: "Marketing", designation: "Head of Marketing" },

  { role: "Employee", name: "Rafi Ahmed", email: "rafi.ahmed@anwargroup.net", password: EMP, employeeId: "AG-1042", department: "Growth Analytics", designation: "Sales Executive" },
  { role: "Employee", name: "Sadia Noor", email: "sadia.noor@anwargroup.net", password: EMP, employeeId: "AG-1057", department: "Growth Analytics", designation: "Account Manager" },
  { role: "Employee", name: "Shuvo Rahman", email: "shuvo.rahman@anwargroup.net", password: EMP, employeeId: "AG-1063", department: "Growth Analytics", designation: "Client Relations Officer" },
  { role: "Employee", name: "Mahin Chowdhury", email: "mahin.chowdhury@anwargroup.net", password: EMP, employeeId: "AG-1078", department: "Growth Analytics", designation: "Sales Associate" },
  { role: "Employee", name: "Tania Karim", email: "tania.karim@anwargroup.net", password: EMP, employeeId: "AG-2011", department: "Human Resources", designation: "HR Officer" },
  { role: "Employee", name: "Nusrat Jahan", email: "nusrat.jahan@anwargroup.net", password: EMP, employeeId: "AG-2019", department: "Human Resources", designation: "Talent Acquisition Specialist" },
  { role: "Employee", name: "Arif Hossain", email: "arif.hossain@anwargroup.net", password: EMP, employeeId: "AG-2024", department: "Human Resources", designation: "L&D Coordinator" },
  { role: "Employee", name: "Mehedi Hasan", email: "mehedi.hasan@anwargroup.net", password: EMP, employeeId: "AG-3005", department: "Marketing", designation: "Brand Executive" },
  { role: "Employee", name: "Sumaiya Akter", email: "sumaiya.akter@anwargroup.net", password: EMP, employeeId: "AG-3012", department: "Marketing", designation: "Digital Marketing Specialist" },
  { role: "Employee", name: "Jannatul Ferdous", email: "jannatul.ferdous@anwargroup.net", password: EMP, employeeId: "AG-4001", department: "Supply Chain", designation: "Procurement Officer" },
  { role: "Employee", name: "Tanvir Alam", email: "tanvir.alam@anwargroup.net", password: EMP, employeeId: "AG-5003", department: "Finance & Accounts", designation: "Accounts Executive" },
];

/** Pending invitation kept in the seed to demonstrate FR-SA-08 (status, resend, Outbox). Not able to log in until the link is used. */
export const DEMO_PENDING_INVITATION = { name: "Rezaul Karim", email: "rezaul.karim@anwargroup.net", role: "Department Head", department: "Finance & Accounts" };
