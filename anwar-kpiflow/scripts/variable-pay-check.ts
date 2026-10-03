/**
 * Variable Pay rules check.
 *
 * Runs the real service functions against the configured database inside ONE transaction that is
 * always rolled back, so nothing it writes is kept. Read-only sheet queries run afterwards.
 *
 *   npx tsx --env-file=.env scripts/variable-pay-check.ts
 */
import { db } from "../src/lib/db";
import { serviceLength } from "../src/lib/variable-pay";
import { departmentSheet, hrSheet } from "../src/lib/variable-pay-data";
import { VpError, returnEvaluation, saveEvaluation, setEligibility, setHrNote, type VpActor, type VpEvaluationInput } from "../src/lib/variable-pay-service";

let pass = 0;
let failCount = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) pass++;
  else failCount++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : `  -> ${JSON.stringify(detail)}`}`);
}
async function rejects(name: string, fn: () => Promise<unknown>, field?: string) {
  try {
    await fn();
    check(name, false, "did not reject");
  } catch (e) {
    check(name, e instanceof VpError && (!field || field in e.fields), e instanceof VpError ? { message: e.message, fields: e.fields } : String(e));
  }
}

const ROLLBACK = new Error("rollback");
const YEAR = 2020; // a past period that cannot clash with real evaluations
const MONTH = 1;

async function main() {
  const s = serviceLength(new Date("2025-03-09T00:00:00Z"), new Date("2026-10-03T00:00:00Z"));
  check("Days matches the sample sheet (573)", s.days === 573, s);
  check("Tenure matches the sample sheet (1 year 6 months)", s.tenure === "1 year 6 months", s);

  const heads = await db.user.findMany({ where: { role: "DEPARTMENT_HEAD", status: "ACTIVE", departmentId: { not: null } }, include: { department: true } });
  let head: (typeof heads)[number] | undefined;
  let employee: Awaited<ReturnType<typeof db.user.findFirst>> = null;
  for (const h of heads) {
    employee = await db.user.findFirst({ where: { departmentId: h.departmentId, role: "EMPLOYEE", status: "ACTIVE" } });
    if (employee) { head = h; break; }
  }
  if (!head || !employee) throw new Error("Need a Department Head with at least one active employee to run this check.");
  const otherHead = heads.find((h) => h.departmentId !== head!.departmentId);
  const hrHead = heads.find((h) => h.department?.code === "HR");
  const superAdmin = await db.user.findFirst({ where: { role: "SUPER_ADMIN", status: "ACTIVE" }, include: { department: true } });
  const hrActor = (hrHead ?? superAdmin) as VpActor | null;
  const nonHrHead = heads.find((h) => h.department?.code !== "HR");

  const input = (over: Partial<VpEvaluationInput> = {}): VpEvaluationInput => ({
    employeeId: employee!.id,
    year: YEAR,
    month: MONTH,
    tasks: [
      { task: "Record keeping of approx 70 loan account", score: "10", remarks: "" },
      { task: "Provide CIB undertaking", score: "10", remarks: "" },
      { task: "Collection & provide regulatory documents", score: "9.5", remarks: "" },
      { task: "Providing board resolution to Banks/NBFIs", score: "9.5", remarks: "" },
      { task: "Close touch with departmental works", score: "9.5", remarks: "on time" },
    ],
    scores: { qualityOfWork: "14", timelineOfDeliverables: "18.5", stakeholderPeerReview: "4.9", attendance: "7.7" },
    remarks: "Consistent month.",
    ...over,
  });

  try {
    await db.$transaction(
      async (tx) => {
        await tx.user.update({ where: { id: employee!.id }, data: { variablePayEligible: false, dateOfJoining: null, supervisorName: null } });

        await rejects("Not on the eligibility list -> cannot be evaluated", () => saveEvaluation(tx, head!, input(), "draft"));
        await rejects("Eligible without DOJ is rejected", () => setEligibility(tx, head!, { employeeId: employee!.id, eligible: true, doj: "", supervisor: "Satyendra Nath Basak" }), "doj");
        await rejects("Eligible without Supervisor is rejected", () => setEligibility(tx, head!, { employeeId: employee!.id, eligible: true, doj: "2025-03-09", supervisor: "" }), "supervisor");
        await rejects("Future DOJ is rejected", () => setEligibility(tx, head!, { employeeId: employee!.id, eligible: true, doj: "2999-01-01", supervisor: "X Y" }), "doj");
        if (otherHead) await rejects("Another department's head cannot set eligibility", () => setEligibility(tx, otherHead, { employeeId: employee!.id, eligible: true, doj: "2025-03-09", supervisor: "X Y" }));
        const u = await setEligibility(tx, head!, { employeeId: employee!.id, eligible: true, doj: "2025-03-09", supervisor: "Satyendra Nath Basak" });
        check("Eligibility saved with DOJ and Supervisor", u.variablePayEligible && u.supervisorName === "Satyendra Nath Basak" && u.dateOfJoining?.toISOString().slice(0, 10) === "2025-03-09");

        await rejects("Future month is rejected", () => saveEvaluation(tx, head!, input({ year: 2099, month: 1 }), "draft"));
        if (otherHead) await rejects("Another department's head cannot evaluate", () => saveEvaluation(tx, otherHead, input(), "draft"));
        await rejects("Task score above 10 is rejected", () => saveEvaluation(tx, head!, input({ tasks: input().tasks.map((t, i) => (i === 0 ? { ...t, score: "10.5" } : t)) }), "draft"), "score_1");
        await rejects("Quality of work above 15 is rejected", () => saveEvaluation(tx, head!, input({ scores: { ...input().scores, qualityOfWork: "15.1" } }), "draft"), "qualityOfWork");
        await rejects("Negative Attendance is rejected", () => saveEvaluation(tx, head!, input({ scores: { ...input().scores, attendance: "-1" } }), "draft"), "attendance");

        const partial = input({ tasks: input().tasks.map((t, i) => (i > 1 ? { task: "", score: "", remarks: "" } : t)), scores: { qualityOfWork: "", timelineOfDeliverables: "", stakeholderPeerReview: "", attendance: "" } });
        const draft = await saveEvaluation(tx, head!, partial, "draft");
        check("Partial draft saves as DRAFT", draft.status === "DRAFT" && draft.kpiScore === 20 && draft.submittedAt === null, draft);
        await rejects("Submit with missing task is rejected", () => saveEvaluation(tx, head!, partial, "submit"), "task_3");
        await rejects("Submit with missing criterion is rejected", () => saveEvaluation(tx, head!, input({ scores: { ...input().scores, attendance: "" } }), "submit"), "attendance");

        const submitted = await saveEvaluation(tx, head!, input(), "submit");
        check("Submit: KPI (5) = 48.5", submitted.kpiScore === 48.5, submitted.kpiScore);
        check("Submit: Total Score = 93.6", submitted.totalScore === 93.6, submitted.totalScore);
        check("Submit: status SUBMITTED with timestamp", submitted.status === "SUBMITTED" && !!submitted.submittedAt);
        check("Submit: one record per employee and month", submitted.id === draft.id);
        check("Submit: employee snapshot stored", submitted.empCode === employee!.employeeId && submitted.supervisor === "Satyendra Nath Basak" && typeof submitted.days === "number" && !!submitted.tenure, submitted);
        const taskCount = await tx.variablePayTask.count({ where: { evaluationId: submitted.id } });
        check("Submit: exactly 5 major tasks stored", taskCount === 5, taskCount);
        await rejects("Submitted evaluation is locked for the Department Head", () => saveEvaluation(tx, head!, input(), "draft"));

        if (nonHrHead) await rejects("A non-HR Department Head cannot write the HR Note", () => setHrNote(tx, nonHrHead, { evaluationId: submitted.id, note: "x" }));
        if (hrActor) {
          const noted = await setHrNote(tx, hrActor, { evaluationId: submitted.id, note: "Verified against attendance register." });
          check("HR Note saved by HR", noted.hrNote === "Verified against attendance register." && noted.hrNoteById === hrActor.id);
          await rejects("Return without a reason is rejected", () => returnEvaluation(tx, hrActor, { evaluationId: submitted.id, reason: " " }), "reason");
          const returned = await returnEvaluation(tx, hrActor, { evaluationId: submitted.id, reason: "Attendance score does not match the register." });
          check("HR can return for correction", returned.status === "RETURNED");
          await rejects("HR Note is closed while returned", () => setHrNote(tx, hrActor, { evaluationId: submitted.id, note: "x" }));
          const redraft = await saveEvaluation(tx, head!, input({ scores: { ...input().scores, attendance: "8" } }), "draft");
          check("Returned evaluation can be edited and stays RETURNED", redraft.status === "RETURNED" && redraft.attendance === 8);
          const again = await saveEvaluation(tx, head!, input({ scores: { ...input().scores, attendance: "8" } }), "submit");
          check("Resubmit: SUBMITTED, total 93.9, return reason cleared", again.status === "SUBMITTED" && again.totalScore === 93.9 && again.returnReason === null, again.totalScore);
        } else {
          console.log("SKIP  HR checks (no HR Department Head or Super Admin found)");
        }
        throw ROLLBACK;
      },
      { timeout: 120000, maxWait: 20000 },
    );
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }

  const left = await db.variablePayEvaluation.count({ where: { periodYear: YEAR, periodMonth: MONTH, employeeId: employee.id } });
  const after = await db.user.findUnique({ where: { id: employee.id } });
  check("Rolled back: no test evaluation left behind", left === 0, left);
  check("Rolled back: employee record unchanged", after?.variablePayEligible === employee.variablePayEligible && after?.supervisorName === employee.supervisorName);

  const sheet = await departmentSheet(head.departmentId!, head.fullName, 2026, 10);
  check("Department sheet query runs", Array.isArray(sheet.rows) && sheet.roster.length > 0, { rows: sheet.rows.length, roster: sheet.roster.length });
  const hr = await hrSheet(2026, 10);
  check("HR sheet query runs", Array.isArray(hr), hr.length);

  console.log(`\n${pass} passed, ${failCount} failed`);
  await db.$disconnect();
  process.exit(failCount ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
