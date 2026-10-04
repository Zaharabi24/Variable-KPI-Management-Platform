/**
 * Demo accounts seeded by prisma/seed.ts — one per required user type, plus every employee so that
 * each department's queue, dashboard and leaderboard can be exercised from the employee side too.
 * Every account listed here is ACTIVE and can sign in immediately.
 */
export const DEMO_PASSWORDS = {
  SUPER_ADMIN: "Admin@2026",
  FINANCE_ADMIN: "Finance@2026",
  DEPARTMENT_HEAD: "Head@2026",
  EMPLOYEE: "User@2026",
} as const;

export type DemoAccount = {
  role: "Super Admin" | "System Admin" | "Finance Admin" | "Department Head" | "Employee";
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
  { role: "System Admin", name: "Tanjila Hoque", email: "sysadmin@anwargroup.net", password: SA, employeeId: "AG-0002", department: "All departments", designation: "System Administrator" },
  { role: "Finance Admin", name: "Mahbub Alam", email: "financeadmin@anwargroup.net", password: DEMO_PASSWORDS.FINANCE_ADMIN, employeeId: "AG-0003", department: "All departments · Variable Pay payments", designation: "Finance Admin" },

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

/**
 * Additional active employees (password as for every employee) that fill out the department rosters, e.g. the
 * Variable Pay "Eligible employees" list. Kept out of DEMO_ACCOUNTS so the sign-in page stays short.
 * `bu` and `dept` are Business Unit and Department codes.
 */
export const DEMO_EXTRA_EMPLOYEES = [
  { name: "Anika Tabassum", email: "anika.tabassum@anwargroup.net", employeeId: "AG-1081", bu: "ATECH", dept: "GA", designation: "Business Analyst" },
  { name: "Fahim Shahriar", email: "fahim.shahriar@anwargroup.net", employeeId: "AG-1084", bu: "ATECH", dept: "GA", designation: "Data Analyst" },
  { name: "Lamia Haque", email: "lamia.haque@anwargroup.net", employeeId: "AG-1089", bu: "ACL", dept: "GA", designation: "Key Account Executive" },
  { name: "Rakibul Islam", email: "rakibul.islam@anwargroup.net", employeeId: "AG-1093", bu: "AIL", dept: "GA", designation: "Territory Sales Officer" },
  { name: "Tasnim Jahan", email: "tasnim.jahan@anwargroup.net", employeeId: "AG-1096", bu: "AGL", dept: "GA", designation: "Sales Coordinator" },
  { name: "Sabbir Hossain", email: "sabbir.hossain@anwargroup.net", employeeId: "AG-1102", bu: "AOPL", dept: "GA", designation: "Senior Sales Executive" },
  { name: "Nabila Sultana", email: "nabila.sultana@anwargroup.net", employeeId: "AG-1107", bu: "ACSL", dept: "GA", designation: "Market Research Officer" },
  { name: "Ashraful Kabir", email: "ashraful.kabir@anwargroup.net", employeeId: "AG-1115", bu: "ATX", dept: "GA", designation: "Regional Sales Manager" },
  { name: "Rumana Akter", email: "rumana.akter@anwargroup.net", employeeId: "AG-1121", bu: "ALM", dept: "GA", designation: "Customer Success Officer" },
  { name: "Zubair Mahmud", email: "zubair.mahmud@anwargroup.net", employeeId: "AG-1128", bu: "AORG", dept: "GA", designation: "Growth Executive" },
  { name: "Shahana Parvin", email: "shahana.parvin@anwargroup.net", employeeId: "AG-2031", bu: "ACL", dept: "HR", designation: "Compensation & Benefits Officer" },
  { name: "Mizanur Rahman", email: "mizanur.rahman@anwargroup.net", employeeId: "AG-2036", bu: "AIL", dept: "HR", designation: "HR Business Partner" },
  { name: "Farzana Yasmin", email: "farzana.yasmin@anwargroup.net", employeeId: "AG-2042", bu: "ATECH", dept: "HR", designation: "Payroll Executive" },
  { name: "Rasel Mia", email: "rasel.mia@anwargroup.net", employeeId: "AG-2047", bu: "AGL", dept: "HR", designation: "Employee Relations Officer" },
  { name: "Tahmid Rahman", email: "tahmid.rahman@anwargroup.net", employeeId: "AG-3018", bu: "ACL", dept: "MKT", designation: "Trade Marketing Executive" },
  { name: "Ishrat Jahan", email: "ishrat.jahan@anwargroup.net", employeeId: "AG-3023", bu: "AIL", dept: "MKT", designation: "Content Specialist" },
  { name: "Nafis Iqbal", email: "nafis.iqbal@anwargroup.net", employeeId: "AG-3029", bu: "ATECH", dept: "MKT", designation: "Graphic Designer" },
  { name: "Sharmin Sultana", email: "sharmin.sultana@anwargroup.net", employeeId: "AG-3034", bu: "AOPL", dept: "MKT", designation: "Event & Activation Officer" },
] as const;

/** Pending invitation kept in the seed to demonstrate FR-SA-08 (status, resend, Outbox). Not able to log in until the link is used. */
export const DEMO_PENDING_INVITATION = { name: "Rezaul Karim", email: "rezaul.karim@anwargroup.net", role: "Department Head", department: "Finance & Accounts" };
