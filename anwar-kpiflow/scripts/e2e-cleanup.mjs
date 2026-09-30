/**
 * Removes everything the end-to-end suite creates (KPIs named "E2E …", users "e2e.*@anwargroup.net",
 * their tokens, emails and audit rows) so the demo data stays clean. Safe to run any time.
 *
 *   node scripts/e2e-cleanup.mjs
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const kpis = await db.kpi.findMany({ where: { name: { startsWith: "E2E " } }, select: { id: true } });
const users = await db.user.findMany({ where: { email: { startsWith: "e2e." } }, select: { id: true, email: true } });
const kpiIds = kpis.map((k) => k.id);
const userIds = users.map((u) => u.id);

const [a, b, c, d, e] = await db.$transaction([
  db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: kpiIds } }, { userId: { in: userIds } }, { entityId: { in: userIds } }] } }),
  db.kpi.deleteMany({ where: { id: { in: kpiIds } } }), // versions, decisions and evidence cascade
  db.emailLog.deleteMany({ where: { toEmail: { startsWith: "e2e." } } }),
  db.accountToken.deleteMany({ where: { userId: { in: userIds } } }),
  db.user.deleteMany({ where: { id: { in: userIds } } }),
]);
console.log(`Removed ${b.count} test KPIs, ${e.count} test users, ${c.count} emails, ${d.count} tokens, ${a.count} audit rows.`);
await db.$disconnect();
