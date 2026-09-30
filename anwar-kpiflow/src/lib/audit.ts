import { db } from "./db";

/** Append-only audit trail (FR-AUD-04). No update/delete path exists for this table in the app. */
export async function audit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details: Record<string, unknown> = {},
) {
  await db.auditLog.create({
    data: { userId, action, entityType, entityId: entityId ?? null, details: JSON.stringify(details) },
  });
}
