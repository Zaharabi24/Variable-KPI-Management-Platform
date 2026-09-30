import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Pooled Postgres connections (Neon's "-pooler" endpoint runs PgBouncer in transaction mode) need
 * Prisma's `pgbouncer=true` flag so it avoids named prepared statements. Marketplace-managed
 * environment variables cannot be edited by hand, so the flag is added here when missing.
 */
function datasourceUrl(): string | undefined {
  const raw = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const pooled = u.hostname.includes("-pooler") || u.searchParams.get("pgbouncer") === "true";
    if (pooled && u.searchParams.get("pgbouncer") !== "true") u.searchParams.set("pgbouncer", "true");
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15");
    return u.toString();
  } catch {
    return raw;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
