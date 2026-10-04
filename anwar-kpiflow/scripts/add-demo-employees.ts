/**
 * Adds the extra demo employees from src/lib/demo.ts (idempotent) without reseeding, so existing
 * accounts, KPIs and Variable Pay requests are left untouched.
 *   npx tsx scripts/add-demo-employees.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_EXTRA_EMPLOYEES, DEMO_PASSWORDS } from "../src/lib/demo";

const db = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORDS.EMPLOYEE, 10);
  let created = 0;
  for (const e of DEMO_EXTRA_EMPLOYEES) {
    const clash = await db.user.findFirst({ where: { OR: [{ email: e.email }, { employeeId: e.employeeId }] } });
    if (clash) {
      console.log(`skipped    ${e.email} (${clash.email === e.email ? "already present" : `Employee ID ${e.employeeId} is used by ${clash.email}`})`);
      continue;
    }
    const [bu, dept] = await Promise.all([db.businessUnit.findUnique({ where: { code: e.bu } }), db.department.findUnique({ where: { code: e.dept } })]);
    if (!bu || !dept) throw new Error(`Business Unit ${e.bu} or Department ${e.dept} not found for ${e.email}`);
    const user = await db.user.create({
      data: {
        fullName: e.name, email: e.email, employeeId: e.employeeId, role: "EMPLOYEE", designation: e.designation, passwordHash: hash, status: "ACTIVE",
        businessUnitId: bu.id, departmentId: dept.id, corporatePhone: "+880 1711 000" + e.employeeId.slice(-3),
      },
    });
    await db.auditLog.create({ data: { action: "EMPLOYEE_DEMO_ACCOUNT_CREATED", entityType: "User", entityId: user.id, details: JSON.stringify({ email: e.email }) } });
    console.log(`created    ${e.email}`);
    created++;
  }
  const byDept = await db.department.findMany({ include: { _count: { select: { users: { where: { role: "EMPLOYEE" } } } } }, orderBy: { name: "asc" } });
  console.log(`\n${created} created. Employees per department:`);
  for (const d of byDept) console.log(`  ${d.name.padEnd(22)} ${d._count.users}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
