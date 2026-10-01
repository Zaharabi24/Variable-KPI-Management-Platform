/**
 * Adds the demo System Admin account (idempotent) without reseeding.
 *   node scripts/add-system-admin.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const email = "sysadmin@anwargroup.net";
const existing = await db.user.findUnique({ where: { email } });
if (existing) {
  if (existing.role !== "SYSTEM_ADMIN") await db.user.update({ where: { id: existing.id }, data: { role: "SYSTEM_ADMIN" } });
  console.log("System Admin already present:", email);
} else {
  const bu = await db.businessUnit.findUnique({ where: { code: "ATECH" } });
  await db.user.create({
    data: {
      fullName: "Tanjila Hoque", email, employeeId: "AG-0002", role: "SYSTEM_ADMIN", designation: "System Administrator",
      passwordHash: await bcrypt.hash("Admin@2026", 10), status: "ACTIVE", businessUnitId: bu?.id ?? null, corporatePhone: "+880 1711 000002",
    },
  });
  console.log("System Admin created:", email, "/ Admin@2026");
}
await db.$disconnect();
