/**
 * Variable Pay rules check.
 *
 * Runs the real service functions against the configured database inside ONE transaction that is
 * always rolled back, so nothing it writes is kept. Read-only list queries run afterwards.
 *
 *   npx tsx --env-file=.env scripts/variable-pay-check.ts
 */
import { db } from "../src/lib/db";
import { serviceLength, vpScopes } from "../src/lib/variable-pay";
import { departmentSheet, filterOptions, requestList, variablePayNav } from "../src/lib/variable-pay-data";
import { VpError, confirmPayment, decideEvaluation, saveEvaluation, setEligibility, setHrNote, type VpActor, type VpEvaluationInput } from "../src/lib/variable-pay-service";

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
const YEAR = 2020; // a past period that cannot clash with real requests
const NO_FILTER = { dept: "", bu: "", status: "", from: "", to: "" };

async function main() {
  const s = serviceLength(new Date("2025-03-09T00:00:00Z"), new Date("2026-10-03T00:00:00Z"));
  check("Days matches the sample sheet (573)", s.days === 573, s);
  check("Tenure matches the sample sheet (1 year 6 months)", s.tenure === "1 year 6 months", s);

  const heads = await db.user.findMany({ where: { role: "DEPARTMENT_HEAD", status: "ACTIVE", departmentId: { not: null } }, include: { department: true } });
  let head: (typeof heads)[number] | undefined;
  let employee: Awaited<ReturnType<typeof db.user.findFirst>> = null;
  for (const h of heads.filter((x) => x.department?.code !== "FIN")) {
    employee = await db.user.findFirst({ where: { departmentId: h.departmentId, role: "EMPLOYEE", status: "ACTIVE" } });
    if (employee) { head = h; break; }
  }
  if (!head || !employee) throw new Error("Need a Department Head with at least one active employee to run this check.");
  const otherHead = heads.find((h) => h.departmentId !== head!.departmentId);
  const hrHead = heads.find((h) => h.department?.code === "HR");
  const admin = await db.user.findFirst({ where: { role: "SUPER_ADMIN", status: "ACTIVE" }, include: { department: true } });
  const financeEmployee = await db.user.findFirst({ where: { status: "ACTIVE", role: "EMPLOYEE", department: { code: "FIN" } }, include: { department: true } });
  if (!admin) throw new Error("Need an active Super Admin to run this check.");

  check("Access: Department Head gets the department view", vpScopes(head)[0] === "department");
  check("Access: Super Admin gets the review view only", JSON.stringify(vpScopes(admin)) === '["review"]', vpScopes(admin));
  check("Access: Finance Admin gets the payments view only", JSON.stringify(vpScopes({ role: "FINANCE_ADMIN", departmentId: null, department: null })) === '["finance"]');
  if (financeEmployee) check("Access: a Finance department employee has no Variable Pay access", vpScopes(financeEmployee).length === 0, vpScopes(financeEmployee));
  check("Access: an ordinary employee has no Variable Pay access", vpScopes({ role: "EMPLOYEE", departmentId: "x", department: { code: "GA" } }).length === 0);
  check("Access: System Admin has no Variable Pay access", vpScopes({ role: "SYSTEM_ADMIN", departmentId: null, department: null }).length === 0);

  const base: VpEvaluationInput = {
    employeeId: employee.id,
    year: YEAR,
    month: 1,
    tasks: [
      { task: "Record keeping of approx 70 loan account", score: "10", remarks: "" },
      { task: "Provide CIB undertaking", score: "10", remarks: "" },
      { task: "Collection & provide regulatory documents", score: "9.5", remarks: "" },
      { task: "Providing board resolution to Banks/NBFIs", score: "9.5", remarks: "" },
      { task: "Close touch with departmental works", score: "9.5", remarks: "on time" },
    ],
    scores: { qualityOfWork: "14", timelineOfDeliverables: "18.5", stakeholderPeerReview: "4.9", attendance: "7.7" },
    remarks: "Consistent month.",
  };
  const input = (over: Partial<VpEvaluationInput> = {}): VpEvaluationInput => ({ ...base, ...over });

  try {
    await db.$transaction(
      async (tx) => {
        await tx.user.update({ where: { id: employee!.id }, data: { variablePayEligible: false, dateOfJoining: null, supervisorName: null } });
        // A temporary Finance Admin, created inside the transaction and rolled back with it.
        const finance = await tx.user.create({
          data: { fullName: "Check Finance Admin", email: "vp-check-finance@anwargroup.net", employeeId: "VP-CHECK-FIN", role: "FINANCE_ADMIN", status: "ACTIVE" },
          include: { department: true },
        });

        /* Eligibility */
        await rejects("Not on the eligibility list -> cannot be evaluated", () => saveEvaluation(tx, head!, input(), "draft"));
        await rejects("Eligible without DOJ is rejected", () => setEligibility(tx, head!, { employeeId: employee!.id, eligible: true, doj: "", supervisor: "Satyendra Nath Basak" }), "doj");
        await rejects("Eligible without Supervisor is rejected", () => setEligibility(tx, head!, { employeeId: employee!.id, eligible: true, doj: "2025-03-09", supervisor: "" }), "supervisor");
        if (otherHead) await rejects("Another department's head cannot set eligibility", () => setEligibility(tx, otherHead, { employeeId: employee!.id, eligible: true, doj: "2025-03-09", supervisor: "X Y" }));
        await rejects("Super Admin cannot set eligibility", () => setEligibility(tx, admin, { employeeId: employee!.id, eligible: true, doj: "2025-03-09", supervisor: "X Y" }));
        const u = await setEligibility(tx, head!, { employeeId: employee!.id, eligible: true, doj: "2025-03-09", supervisor: "Satyendra Nath Basak" });
        check("Eligibility saved with DOJ and Supervisor", u.variablePayEligible && u.supervisorName === "Satyendra Nath Basak");

        /* Draft and validation */
        await rejects("Future month is rejected", () => saveEvaluation(tx, head!, input({ year: 2099 }), "draft"));
        if (otherHead) await rejects("Another department's head cannot evaluate", () => saveEvaluation(tx, otherHead, input(), "draft"));
        await rejects("Super Admin cannot create an evaluation", () => saveEvaluation(tx, admin, input(), "draft"));
        await rejects("Task score above 10 is rejected", () => saveEvaluation(tx, head!, input({ tasks: base.tasks.map((t, i) => (i === 0 ? { ...t, score: "10.5" } : t)) }), "draft"), "score_1");
        await rejects("Quality of work above 15 is rejected", () => saveEvaluation(tx, head!, input({ scores: { ...base.scores, qualityOfWork: "15.1" } }), "draft"), "qualityOfWork");
        const partial = input({ tasks: base.tasks.map((t, i) => (i > 1 ? { task: "", score: "", remarks: "" } : t)), scores: { qualityOfWork: "", timelineOfDeliverables: "", stakeholderPeerReview: "", attendance: "" } });
        const draft = await saveEvaluation(tx, head!, partial, "draft");
        check("Partial draft saves as DRAFT with no submission time", draft.status === "DRAFT" && draft.kpiScore === 20 && draft.submittedAt === null);
        await rejects("Submit with missing task is rejected", () => saveEvaluation(tx, head!, partial, "submit"), "task_3");
        await rejects("A draft cannot be approved", () => decideEvaluation(tx, admin, { evaluationId: draft.id, decision: "approve", comment: "" }));

        /* Submit */
        const before = Date.now();
        const submitted = await saveEvaluation(tx, head!, input(), "submit");
        check("Submit: KPI (5) = 48.5 and Total Score = 93.6", submitted.kpiScore === 48.5 && submitted.totalScore === 93.6, [submitted.kpiScore, submitted.totalScore]);
        check("Submit: status SUBMITTED, exact submission time recorded", submitted.status === "SUBMITTED" && !!submitted.submittedAt && submitted.submittedAt.getTime() >= before - 1000);
        check("Submit: one record per employee and month", submitted.id === draft.id);
        await rejects("Submitted request is locked for the Department Head", () => saveEvaluation(tx, head!, input(), "draft"));

        /* Decision authority */
        await rejects("Department Head cannot approve their own request", () => decideEvaluation(tx, head!, { evaluationId: submitted.id, decision: "approve", comment: "" }));
        if (hrHead) await rejects("HR Department Head cannot approve", () => decideEvaluation(tx, hrHead, { evaluationId: submitted.id, decision: "approve", comment: "" }));
        if (financeEmployee) await rejects("A Finance department employee cannot confirm payment", () => confirmPayment(tx, financeEmployee, { evaluationId: submitted.id, amount: "5000", reference: "", note: "" }));
        {
          await rejects("Finance Admin cannot approve", () => decideEvaluation(tx, finance, { evaluationId: submitted.id, decision: "approve", comment: "" }));
          await rejects("Finance Admin cannot pay before approval", () => confirmPayment(tx, finance, { evaluationId: submitted.id, amount: "5000", reference: "", note: "" }));
        }
        await rejects("Return without feedback is rejected", () => decideEvaluation(tx, admin, { evaluationId: submitted.id, decision: "return", comment: " " }), "comment");
        await rejects("Reject without a reason is rejected", () => decideEvaluation(tx, admin, { evaluationId: submitted.id, decision: "reject", comment: "" }), "comment");

        /* HR note */
        if (otherHead && otherHead.department?.code !== "HR") await rejects("A non-HR Department Head cannot write the HR Note", () => setHrNote(tx, otherHead, { evaluationId: submitted.id, note: "x" }));
        const noted = await setHrNote(tx, (hrHead ?? admin) as VpActor, { evaluationId: submitted.id, note: "Verified against attendance register." });
        check("HR Note saved by HR", noted.hrNote === "Verified against attendance register.");

        /* Return -> correct -> resubmit */
        const returned = await decideEvaluation(tx, admin, { evaluationId: submitted.id, decision: "return", comment: "Attendance score does not match the register." });
        check("Super Admin returns with feedback", returned.status === "RETURNED" && returned.returnReason === "Attendance score does not match the register." && returned.decidedById === admin.id);
        await rejects("A returned request cannot be decided again", () => decideEvaluation(tx, admin, { evaluationId: submitted.id, decision: "approve", comment: "" }));
        const redraft = await saveEvaluation(tx, head!, input({ scores: { ...base.scores, attendance: "8" } }), "draft");
        check("Returned request can be corrected and stays RETURNED", redraft.status === "RETURNED" && redraft.attendance === 8);
        const again = await saveEvaluation(tx, head!, input({ scores: { ...base.scores, attendance: "8" } }), "submit");
        check("Resubmit: SUBMITTED, total 93.9, previous decision cleared", again.status === "SUBMITTED" && again.totalScore === 93.9 && again.returnReason === null && again.decidedAt === null, again.totalScore);

        /* Approve -> Finance */
        const approved = await decideEvaluation(tx, admin, { evaluationId: submitted.id, decision: "approve", comment: "Good month." });
        check("Super Admin approves", approved.status === "APPROVED" && approved.decidedById === admin.id && !!approved.decidedAt);
        await rejects("Approved request is locked for the Department Head", () => saveEvaluation(tx, head!, input(), "draft"));
        await rejects("An approved request cannot be decided twice", () => decideEvaluation(tx, admin, { evaluationId: submitted.id, decision: "reject", comment: "changed my mind" }));
        await rejects("Super Admin cannot confirm payment", () => confirmPayment(tx, admin, { evaluationId: submitted.id, amount: "5000", reference: "", note: "" }));
        await rejects("Department Head cannot confirm payment", () => confirmPayment(tx, head!, { evaluationId: submitted.id, amount: "5000", reference: "", note: "" }));
        {
          await rejects("Payment amount is required", () => confirmPayment(tx, finance, { evaluationId: submitted.id, amount: "", reference: "", note: "" }), "amount");
          await rejects("Zero or negative payment is rejected", () => confirmPayment(tx, finance, { evaluationId: submitted.id, amount: "0", reference: "", note: "" }), "amount");
          const paid = await confirmPayment(tx, finance, { evaluationId: submitted.id, amount: "12500.505", reference: "PV-2020-001", note: "January payroll" });
          check("Finance Admin confirms payment", paid.status === "PAYMENT_CONFIRMED" && paid.paymentAmount === 12500.51 && paid.paymentConfirmedById === finance.id && paid.paymentReference === "PV-2020-001", paid.paymentAmount);
          await rejects("Payment cannot be confirmed twice", () => confirmPayment(tx, finance, { evaluationId: submitted.id, amount: "1", reference: "", note: "" }));
          await rejects("HR Note is closed after payment", () => setHrNote(tx, admin, { evaluationId: submitted.id, note: "late" }));
        }
        await rejects("Finance Admin cannot create an evaluation", () => saveEvaluation(tx, finance, input({ month: 3 }), "draft"));
        await rejects("Finance Admin cannot write the HR Note", () => setHrNote(tx, finance, { evaluationId: submitted.id, note: "x" }));

        const events = await tx.variablePayEvent.findMany({ where: { evaluationId: submitted.id }, orderBy: { createdAt: "asc" } });
        const expected = ["SUBMITTED", "HR_NOTE", "RETURNED", "RESUBMITTED", "APPROVED", "PAYMENT_CONFIRMED"];
        check("History records every step in order", JSON.stringify(events.map((e) => e.action)) === JSON.stringify(expected), events.map((e) => e.action));
        check("History keeps the feedback comment", events.find((e) => e.action === "RETURNED")?.comment === "Attendance score does not match the register.");

        /* Reject is final */
        const second = await saveEvaluation(tx, head!, input({ month: 2 }), "submit");
        const rejected = await decideEvaluation(tx, admin, { evaluationId: second.id, decision: "reject", comment: "Not eligible this month." });
        check("Super Admin rejects with a reason", rejected.status === "REJECTED" && rejected.decisionComment === "Not eligible this month.");
        await rejects("A rejected request cannot be edited or resubmitted", () => saveEvaluation(tx, head!, input({ month: 2 }), "submit"));
        await rejects("A rejected request cannot be paid", () => confirmPayment(tx, finance, { evaluationId: second.id, amount: "100", reference: "", note: "" }));

        throw ROLLBACK;
      },
      { timeout: 180000, maxWait: 20000 },
    );
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }

  const left = (await db.variablePayEvaluation.count({ where: { periodYear: YEAR, employeeId: employee.id } })) + (await db.user.count({ where: { employeeId: "VP-CHECK-FIN" } }));
  const after = await db.user.findUnique({ where: { id: employee.id } });
  check("Rolled back: no test request or test account left behind", left === 0, left);
  check("Rolled back: employee record unchanged", after?.variablePayEligible === employee.variablePayEligible && after?.supervisorName === employee.supervisorName);

  /* Read-only queries against real data */
  const sheet = await departmentSheet(head.departmentId!, head.fullName, 2026, 10);
  check("Department sheet query runs", Array.isArray(sheet.rows) && sheet.roster.length > 0);
  const all = await requestList("review", NO_FILTER);
  const realSubmitted = await db.variablePayEvaluation.count({ where: { status: { not: "DRAFT" } } });
  check("Review list defaults to every request, across all months", all.length === realSubmitted, { listed: all.length, inDb: realSubmitted });
  const opts = await filterOptions();
  check("Filter options: departments and business units", opts.departments.length > 0 && opts.businessUnits.length > 0);
  if (all.length) {
    const first = await db.variablePayEvaluation.findUnique({ where: { id: all[0].evaluationId! }, include: { employee: true } });
    const byDept = await requestList("review", { ...NO_FILTER, dept: first!.departmentId ?? "" });
    check("Department filter keeps matching requests", byDept.some((r) => r.evaluationId === first!.id) && byDept.every((r) => r.department === first!.departmentName));
    const otherDept = opts.departments.find((d) => d.id !== first!.departmentId);
    if (otherDept) check("Department filter excludes other departments", !(await requestList("review", { ...NO_FILTER, dept: otherDept.id })).some((r) => r.evaluationId === first!.id));
    if (first!.employee.businessUnitId) check("Business Unit filter keeps matching requests", (await requestList("review", { ...NO_FILTER, bu: first!.employee.businessUnitId })).some((r) => r.evaluationId === first!.id));
    const d = new Date(first!.submittedAt!.getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10);
    check("Submission date filter: the day itself matches", (await requestList("review", { ...NO_FILTER, from: d, to: d })).some((r) => r.evaluationId === first!.id));
    check("Submission date filter: an earlier range excludes it", !(await requestList("review", { ...NO_FILTER, from: "2000-01-01", to: "2000-12-31" })).some((r) => r.evaluationId === first!.id));
  }
  check("Finance list holds only approved or paid requests", (await requestList("finance", NO_FILTER)).every((r) => r.status === "APPROVED" || r.status === "PAYMENT_CONFIRMED"));
  const nav = await variablePayNav(admin);
  const waiting = await db.variablePayEvaluation.count({ where: { status: "SUBMITTED" } });
  check("Super Admin sidebar badge = requests awaiting review", nav.show && nav.badge === waiting, { badge: nav.badge, waiting });

  console.log(`\n${pass} passed, ${failCount} failed`);
  await db.$disconnect();
  process.exit(failCount ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
