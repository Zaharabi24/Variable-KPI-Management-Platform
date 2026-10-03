/**
 * Adds the demo Finance Admin account (idempotent) without reseeding.
 *   node scripts/add-finance-admin.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const email = "financeadmin@anwargroup.net";
const existing = await db.user.findUnique({ where: { email } });
if (existing) {
  if (existing.role !== "FINANCE_ADMIN") await db.user.update({ where: { id: existing.id }, data: { role: "FINANCE_ADMIN" } });
  console.log("Finance Admin already present:", email);
} else {
  const clash = await db.user.findUnique({ where: { employeeId: "AG-0003" } });
  if (clash) throw new Error(`Employee ID AG-0003 is already used by ${clash.email}`);
  const bu = await db.businessUnit.findUnique({ where: { code: "ATECH" } });
  const user = await db.user.create({
    data: {
      fullName: "Mahbub Alam", email, employeeId: "AG-0003", role: "FINANCE_ADMIN", designation: "Finance Admin",
      passwordHash: await bcrypt.hash("Finance@2026", 10), status: "ACTIVE", businessUnitId: bu?.id ?? null, corporatePhone: "+880 1711 000003",
    },
  });
  await db.auditLog.create({ data: { action: "FINANCE_ADMIN_DEMO_ACCOUNT_CREATED", entityType: "User", entityId: user.id, details: JSON.stringify({ email }) } });
  console.log("Finance Admin created:", email);
}
await db.$disconnect();
