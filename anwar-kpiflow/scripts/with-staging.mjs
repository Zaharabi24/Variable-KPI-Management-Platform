/**
 * Runs a command against a separate Postgres schema ("staging") of the same database, so schema changes
 * and seed data can be tried without touching the live tables in "public".
 *   node scripts/with-staging.mjs npx prisma db push
 *   node scripts/with-staging.mjs npx tsx prisma/seed.ts
 *   node scripts/with-staging.mjs npx next dev -p 3001
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const SCHEMA = process.env.STAGING_SCHEMA || "staging";
const env = { ...process.env };
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (!m) continue;
  let value = m[2].replace(/^["']|["']$/g, "");
  if (/^(POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING|DATABASE_URL|DATABASE_URL_UNPOOLED)$/.test(m[1])) {
    const u = new URL(value);
    u.searchParams.set("schema", SCHEMA);
    value = u.toString();
  }
  env[m[1]] = value;
}
const [cmd, ...args] = process.argv.slice(2);
if (!cmd) { console.error("Usage: node scripts/with-staging.mjs <command> [args]"); process.exit(1); }
console.log(`[staging] schema "${SCHEMA}" → ${cmd} ${args.join(" ")}`);
spawn(cmd, args, { stdio: "inherit", env, shell: true }).on("exit", (code) => process.exit(code ?? 1));
