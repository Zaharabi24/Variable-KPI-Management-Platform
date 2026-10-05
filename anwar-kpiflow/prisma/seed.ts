/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BUSINESS_UNITS, DEFAULT_DEPARTMENTS } from "../src/lib/constants";
import { DEMO_EXTRA_EMPLOYEES, DEMO_PASSWORDS } from "../src/lib/demo";
import { seedDemoSheets } from "./demo-sheets";

const db = new PrismaClient();

/**
 * Full reset: wipes every table and rebuilds the demo organisation, accounts and KPI score sheets.
 * To move an existing database to the score-sheet model without touching its accounts,
 * use scripts/migrate-score-sheets.ts instead.
 */
async function main() {
  console.log("Seeding Anwar KPIFlow…");
  await db.$transaction([
    db.auditLog.deleteMany(), db.emailLog.deleteMany(), db.mailMessage.deleteMany(), db.reviewDecision.deleteMany(), db.kpiVersion.deleteMany(),
    db.evidenceFile.deleteMany(), db.kpi.deleteMany(), db.accountToken.deleteMany(), db.user.deleteMany(),
    db.department.deleteMany(), db.businessUnit.deleteMany(), db.setting.deleteMany(),
  ]);

  const units = Object.fromEntries(await Promise.all(BUSINESS_UNITS.map(async (u) => [u.code, await db.businessUnit.create({ data: u })] as const)));
  const depts = Object.fromEntries(await Promise.all(DEFAULT_DEPARTMENTS.map(async (d) => [d.code, await db.department.create({ data: d })] as const)));

  const hash = async (p: string) => bcrypt.hash(p, 10);
  const [adminHash, headHash, userHash] = await Promise.all([hash(DEMO_PASSWORDS.SUPER_ADMIN), hash(DEMO_PASSWORDS.DEPARTMENT_HEAD), hash(DEMO_PASSWORDS.EMPLOYEE)]);

  const mk = (fullName: string, email: string, employeeId: string, role: string, bu: string, dept: string | null, designation: string, passwordHash: string | null, status = "ACTIVE") =>
    db.user.create({ data: { fullName, email, employeeId, role, designation, passwordHash, status, businessUnitId: units[bu].id, departmentId: dept ? depts[dept].id : null, corporatePhone: passwordHash ? "+880 1711 000" + employeeId.slice(-3) : null } });

  const admin = await mk("Sarwar Hossain", "superadmin@anwargroup.net", "AG-0001", "SUPER_ADMIN", "ATECH", null, "Group Head of Performance", adminHash);
  await mk("Tanjila Hoque", "sysadmin@anwargroup.net", "AG-0002", "SYSTEM_ADMIN", "ATECH", null, "System Administrator", adminHash);
  // The three reviewing admins after the Department Head: HR → Finance → Audit
  await mk("Mahbub Alam", "financeadmin@anwargroup.net", "AG-0003", "FINANCE_ADMIN", "ATECH", null, "Finance Admin", await hash(DEMO_PASSWORDS.FINANCE_ADMIN));
  await mk("Shamima Nasrin", "hradmin@anwargroup.net", "AG-0004", "HR_ADMIN", "ATECH", null, "HR Admin", await hash(DEMO_PASSWORDS.HR_ADMIN));
  await mk("Kazi Ashraf", "auditadmin@anwargroup.net", "AG-0005", "AUDIT_ADMIN", "ATECH", null, "Audit Admin", await hash(DEMO_PASSWORDS.AUDIT_ADMIN));

  await mk("Nasrin Islam", "nasrin.islam@anwargroup.net", "AG-0101", "DEPARTMENT_HEAD", "ATECH", "GA", "Head of Growth Analytics", headHash);
  await mk("Kamal Hasan", "kamal.hasan@anwargroup.net", "AG-0102", "DEPARTMENT_HEAD", "ATECH", "GA", "Deputy Head, Growth Analytics", headHash);
  await mk("Farhana Rahman", "farhana.rahman@anwargroup.net", "AG-0201", "DEPARTMENT_HEAD", "ACL", "HR", "Head of Human Resources", headHash);
  await mk("Imran Chowdhury", "imran.chowdhury@anwargroup.net", "AG-0301", "DEPARTMENT_HEAD", "AIL", "MKT", "Head of Marketing", headHash);
  // Growth Analytics employees
  await mk("Rafi Ahmed", "rafi.ahmed@anwargroup.net", "AG-1042", "EMPLOYEE", "ATECH", "GA", "Sales Executive", userHash);
  await mk("Sadia Noor", "sadia.noor@anwargroup.net", "AG-1057", "EMPLOYEE", "ACL", "GA", "Account Manager", userHash);
  await mk("Shuvo Rahman", "shuvo.rahman@anwargroup.net", "AG-1063", "EMPLOYEE", "AGL", "GA", "Client Relations Officer", userHash);
  await mk("Mahin Chowdhury", "mahin.chowdhury@anwargroup.net", "AG-1078", "EMPLOYEE", "AOPL", "GA", "Sales Associate", userHash);
  // HR employees
  await mk("Tania Karim", "tania.karim@anwargroup.net", "AG-2011", "EMPLOYEE", "ACL", "HR", "HR Officer", userHash);
  await mk("Nusrat Jahan", "nusrat.jahan@anwargroup.net", "AG-2019", "EMPLOYEE", "ATX", "HR", "Talent Acquisition Specialist", userHash);
  await mk("Arif Hossain", "arif.hossain@anwargroup.net", "AG-2024", "EMPLOYEE", "AJSM", "HR", "L&D Coordinator", userHash);
  // Marketing employees
  await mk("Mehedi Hasan", "mehedi.hasan@anwargroup.net", "AG-3005", "EMPLOYEE", "AIL", "MKT", "Brand Executive", userHash);
  await mk("Sumaiya Akter", "sumaiya.akter@anwargroup.net", "AG-3012", "EMPLOYEE", "ALM", "MKT", "Digital Marketing Specialist", userHash);
  // Finance & Supply Chain employees (departments whose head is still being invited, so no Approval Person is offered yet)
  await mk("Jannatul Ferdous", "jannatul.ferdous@anwargroup.net", "AG-4001", "EMPLOYEE", "AORG", "SCM", "Procurement Officer", userHash);
  await mk("Tanvir Alam", "tanvir.alam@anwargroup.net", "AG-5003", "EMPLOYEE", "ACSL", "FIN", "Accounts Executive", userHash);
  // Extra employees that fill out the department rosters
  for (const e of DEMO_EXTRA_EMPLOYEES) await mk(e.name, e.email, e.employeeId, "EMPLOYEE", e.bu, e.dept, e.designation, userHash);

  // Pending invitation (shows invitation status, resend and the Outbox)
  const pendingHead = await mk("Rezaul Karim", "rezaul.karim@anwargroup.net", "AG-0401", "DEPARTMENT_HEAD", "ACSL", "FIN", "Head of Finance & Accounts", null, "PENDING_SETUP");
  const token = [...Array(64)].map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  await db.accountToken.create({ data: { token, type: "INVITATION", userId: pendingHead.id, invitedById: admin.id, expiresAt: new Date(Date.now() + 48 * 3600000) } });
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/setup-password?token=${token}`;
  await db.emailLog.create({
    data: {
      toEmail: pendingHead.email,
      subject: "You have been invited to Anwar KPIFlow as a Department Head",
      body: `Hello ${pendingHead.fullName},\n\nThe Super Admin has invited you to Anwar KPIFlow as a Department Head. Use the secure link below to set your password. The link is single-use and expires in 48 hours.\n\n${link}\n\nAnwar KPIFlow · Anwar Group of Industries`,
      link,
    },
  });
  await db.auditLog.create({ data: { userId: admin.id, action: "DEPARTMENT_HEAD_INVITED", entityType: "User", entityId: pendingHead.id, details: JSON.stringify({ email: pendingHead.email }) } });

  const sheets = await seedDemoSheets(db);
  await db.setting.createMany({ data: [{ key: "leaderboard.high", value: "90" }, { key: "leaderboard.middle", value: "70" }, { key: "session.hours", value: "12" }] });

  console.log(`Seeded ${Object.keys(units).length} business units, ${Object.keys(depts).length} departments, ${await db.user.count()} users, ${sheets} KPI sheets.`);
  console.log("\nDemo credentials:");
  console.log(`  Super Admin       superadmin@anwargroup.net      ${DEMO_PASSWORDS.SUPER_ADMIN}`);
  console.log(`  System Admin      sysadmin@anwargroup.net        ${DEMO_PASSWORDS.SUPER_ADMIN}`);
  console.log(`  HR Admin          hradmin@anwargroup.net         ${DEMO_PASSWORDS.HR_ADMIN}`);
  console.log(`  Finance Admin     financeadmin@anwargroup.net    ${DEMO_PASSWORDS.FINANCE_ADMIN}`);
  console.log(`  Audit Admin       auditadmin@anwargroup.net      ${DEMO_PASSWORDS.AUDIT_ADMIN}`);
  console.log(`  Department Head   nasrin.islam@anwargroup.net    ${DEMO_PASSWORDS.DEPARTMENT_HEAD}  (Growth Analytics)`);
  console.log(`  Employee          rafi.ahmed@anwargroup.net      ${DEMO_PASSWORDS.EMPLOYEE}  (Growth Analytics)`);
  console.log(`  ...and every other account listed in docs/DEMO_ACCOUNTS.md`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
