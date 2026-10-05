/* eslint-disable no-console */
/**
 * Moves an existing database to the KPI score-sheet model without touching its user accounts.
 * The old KPI records (target / actual / weight) and the Variable Pay records cannot be expressed in the
 * new model, so they are exported to a JSON backup first and then removed.
 *
 *   1. npx tsx --env-file=.env scripts/migrate-score-sheets.ts prepare    backup + remove old KPI and Variable Pay rows
 *   2. npx prisma db push --accept-data-loss                              drop the old columns and tables, add the new ones
 *   3. npx tsx --env-file=.env scripts/migrate-score-sheets.ts finish     add the HR Admin and Audit Admin accounts and demo KPI sheets
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_ACCOUNTS } from "../src/lib/demo";
import { seedDemoSheets } from "../prisma/demo-sheets";

const db = new PrismaClient();
const OLD_TABLES = ["ReviewDecision", "KpiVersion", "EvidenceFile", "Kpi", "VariablePayEvent", "VariablePayTask", "VariablePayEvaluation"];

async function tableExists(name: string) {
  const rows = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ${name}`;
  return Number(rows[0].n) > 0;
}

async function prepare() {
  const backup: Record<string, unknown[]> = {};
  for (const t of OLD_TABLES) {
    if (!(await tableExists(t))) continue;
    // File bytes are left out of the backup; their names, sizes and fingerprints are kept.
    const cols = t === "EvidenceFile" ? `"id","kpiId","fileName","storedName","mimeType","size","sha256","uploadedById","createdAt"` : "*";
    backup[t] = await db.$queryRawUnsafe(`SELECT ${cols} FROM "${t}"`);
    console.log(`${t.padEnd(24)} ${backup[t].length} rows`);
  }
  const dir = path.resolve(__dirname, "../../backups");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `legacy-kpi-and-variable-pay-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(file, JSON.stringify(backup, (_k, v) => (typeof v === "bigint" ? Number(v) : v), 2));
  console.log(`Backup written to ${file}`);

  for (const t of OLD_TABLES) {
    if (!(await tableExists(t))) continue;
    const n = await db.$executeRawUnsafe(`DELETE FROM "${t}"`);
    console.log(`removed ${n} rows from ${t}`);
  }
  console.log("\nNext: npx prisma db push --accept-data-loss");
}

async function finish() {
  const unit = await db.businessUnit.findFirst({ where: { code: "ATECH" } });
  for (const role of ["HR Admin", "Audit Admin"] as const) {
    const acc = DEMO_ACCOUNTS.find((d) => d.role === role)!;
    const clash = await db.user.findFirst({ where: { OR: [{ email: acc.email }, { employeeId: acc.employeeId }] } });
    if (clash) { console.log(`${role} account already present (${clash.email})`); continue; }
    const user = await db.user.create({
      data: {
        fullName: acc.name, email: acc.email, employeeId: acc.employeeId, role: role === "HR Admin" ? "HR_ADMIN" : "AUDIT_ADMIN", designation: acc.designation,
        passwordHash: await bcrypt.hash(acc.password, 10), status: "ACTIVE", businessUnitId: unit?.id ?? null, corporatePhone: "+880 1711 000" + acc.employeeId.slice(-3),
      },
    });
    await db.auditLog.create({ data: { action: `${user.role}_DEMO_ACCOUNT_CREATED`, entityType: "User", entityId: user.id, details: JSON.stringify({ email: acc.email }) } });
    console.log(`${role} account created: ${acc.email}`);
  }
  if ((await db.kpi.count()) > 0) console.log("KPI sheets already exist; no demo sheets were added.");
  else await seedDemoSheets(db);
  console.log(`\n${await db.user.count()} users, ${await db.kpi.count()} KPI sheets.`);
}

const phase = process.argv[2];
(phase === "prepare" ? prepare() : phase === "finish" ? finish() : Promise.reject(new Error("Usage: migrate-score-sheets.ts prepare | finish")))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
