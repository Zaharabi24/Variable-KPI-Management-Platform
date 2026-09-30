/**
 * One-off helper: give every employee that is still "pending setup" an active account with the
 * demo password, without reseeding (so open sessions are not disturbed). Also adds any employee
 * from the demo roster that does not exist yet.
 *
 *   node scripts/activate-employees.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "User@2026";
const hash = await bcrypt.hash(PASSWORD, 10);

const pending = await db.user.findMany({ where: { role: "EMPLOYEE", status: "PENDING_SETUP" } });
for (const u of pending) {
  await db.user.update({ where: { id: u.id }, data: { passwordHash: hash, status: "ACTIVE" } });
  await db.accountToken.updateMany({ where: { userId: u.id, usedAt: null }, data: { usedAt: new Date() } });
  console.log(`activated  ${u.email}`);
}

const roster = [
  { fullName: "Jannatul Ferdous", email: "jannatul.ferdous@anwargroup.net", employeeId: "AG-4001", bu: "AORG", dept: "SCM", designation: "Procurement Officer" },
  { fullName: "Tanvir Alam", email: "tanvir.alam@anwargroup.net", employeeId: "AG-5003", bu: "ACSL", dept: "FIN", designation: "Accounts Executive" },
];
for (const r of roster) {
  const exists = await db.user.findUnique({ where: { email: r.email } });
  if (exists) continue;
  const [bu, dept] = await Promise.all([db.businessUnit.findUnique({ where: { code: r.bu } }), db.department.findUnique({ where: { code: r.dept } })]);
  await db.user.create({
    data: { fullName: r.fullName, email: r.email, employeeId: r.employeeId, role: "EMPLOYEE", designation: r.designation, passwordHash: hash, status: "ACTIVE", businessUnitId: bu?.id, departmentId: dept?.id },
  });
  console.log(`created    ${r.email}`);
}

const all = await db.user.findMany({ where: { role: "EMPLOYEE" }, include: { department: true }, orderBy: [{ department: { name: "asc" } }, { fullName: "asc" }] });
console.log(`\n${all.length} employee accounts (${all.filter((u) => u.status === "ACTIVE").length} active):`);
for (const u of all) console.log(`  ${u.status.padEnd(14)} ${u.email.padEnd(36)} ${u.department?.name ?? "-"}`);
await db.$disconnect();
