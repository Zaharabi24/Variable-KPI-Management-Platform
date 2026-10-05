import { db } from "./db";
import { ROLES, USER_STATUS } from "./constants";
import { appUrl, sendEmail } from "./email";
import { kpiTitle, type KpiStage } from "./kpi";

/**
 * KPI notifications. They go to the in-app Email Outbox like every other email (lib/email.ts).
 * A delivery problem must never undo a saved workflow step, so failures are logged and swallowed.
 */

type KpiRef = { id: string; ownerId: string; approverId: string | null; periodYear: number; periodMonth: number };
const STAGE_ROLE: Record<Exclude<KpiStage, "EMPLOYEE" | "DEPT">, string> = { HR: ROLES.HR_ADMIN, FINANCE: ROLES.FINANCE_ADMIN, AUDIT: ROLES.AUDIT_ADMIN };

async function recipients(stage: KpiStage, kpi: KpiRef): Promise<{ email: string }[]> {
  if (stage === "EMPLOYEE") return db.user.findMany({ where: { id: kpi.ownerId }, select: { email: true } });
  if (stage === "DEPT") return kpi.approverId ? db.user.findMany({ where: { id: kpi.approverId, status: USER_STATUS.ACTIVE }, select: { email: true } }) : [];
  return db.user.findMany({ where: { role: STAGE_ROLE[stage], status: USER_STATUS.ACTIVE }, select: { email: true } });
}

/** Tell whoever must act next (or the employee) what happened. `ownerName` identifies the KPI in the subject. */
export async function notifyKpi(stage: KpiStage, kpi: KpiRef, ownerName: string, headline: string, body: string) {
  try {
    const to = await recipients(stage, kpi);
    const link = appUrl(stage === "EMPLOYEE" ? `/my-kpi/${kpi.id}` : `/kpi-requests?open=${kpi.id}`);
    const subject = `${headline} — ${ownerName}, ${kpiTitle(kpi)}`;
    await Promise.all(to.map((u) => sendEmail({ to: u.email, subject, body, link })));
  } catch (e) {
    console.error("[kpi] notification failed", e);
  }
}
