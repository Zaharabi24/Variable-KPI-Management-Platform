/**
 * KPI workflow self-check. Runs the whole approval chain inside one transaction that is always rolled back,
 * so nothing it writes stays in the database.
 *   node scripts/with-staging.mjs npx tsx scripts/kpi-check.ts     (staging schema)
 *   npx tsx --env-file=.env scripts/kpi-check.ts                   (configured database)
 */
import { PrismaClient } from "@prisma/client";
import { KPI_STATUS, canActOn, canSeePayment, canViewKpi, reviewStagesFor, routeStates, stageOf, sumTasks, totalScore } from "../src/lib/kpi";
import { KpiError, auditDecide, deleteKpi, deptDecide, financeDecide, hrDecide, saveSheet, type Actor, type SheetInput, type TaskInput } from "../src/lib/kpi-service";
import { kpiInclude, toView } from "../src/lib/kpi-data";

const db = new PrismaClient();
let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++; else failed++;
  if (!ok) console.log(`FAIL  ${name}${detail === undefined ? "" : `  -> ${JSON.stringify(detail)}`}`);
}
async function rejects(name: string, fn: () => Promise<unknown>, field?: string) {
  try {
    await fn();
    check(name, false, "expected a KpiError, but it succeeded");
  } catch (e) {
    check(name, e instanceof KpiError && (!field || field in e.fields), e instanceof KpiError ? e.fields : String(e));
  }
}
class Rollback extends Error {}

async function main() {
  /* ---------- pure rules ---------- */
  check("sum of five task scores", sumTasks([9.97, 9.9, 9.9, 9.8, 9.85]) === 49.42);
  check("sum is null until every task is scored", sumTasks([9, 9, null, 9, 9]) === null);
  check("total score matches the reference sheet", totalScore({ kpiScore: 49.42, qualityOfWork: 14.95, timelineOfDeliverables: 19.99, stakeholderPeerReview: 4.95, attendance: 10 }) === 99.31);
  check("total is null until attendance exists", totalScore({ kpiScore: 49.42, qualityOfWork: 14.95, timelineOfDeliverables: 19.99, stakeholderPeerReview: 4.95, attendance: null }) === null);
  check("stage of each status", stageOf("SUBMITTED") === "DEPT" && stageOf("RETURNED_TO_HEAD") === "DEPT" && stageOf("DEPT_APPROVED") === "HR" && stageOf("RETURNED_TO_HR") === "HR" && stageOf("HR_APPROVED") === "FINANCE" && stageOf("RETURNED_TO_FINANCE") === "FINANCE" && stageOf("FINANCE_APPROVED") === "AUDIT" && stageOf("COMPLETED") === null && stageOf("RETURNED") === "EMPLOYEE");
  check("route: HR stage", routeStates("DEPT_APPROVED").join() === "done,done,current,todo,todo");
  check("route: returned to finance", routeStates("RETURNED_TO_FINANCE").join() === "done,done,done,returned,todo");
  check("route: completed", routeStates("COMPLETED").every((s) => s === "done"));
  check("payment visibility by role", canSeePayment({ role: "HR_ADMIN" }) && canSeePayment({ role: "FINANCE_ADMIN" }) && canSeePayment({ role: "AUDIT_ADMIN" }) && canSeePayment({ role: "SUPER_ADMIN" }) && !canSeePayment({ role: "EMPLOYEE" }) && !canSeePayment({ role: "DEPARTMENT_HEAD" }) && !canSeePayment({ role: "SYSTEM_ADMIN" }));
  check("review stages by role", reviewStagesFor({ role: "SUPER_ADMIN" }).length === 4 && reviewStagesFor({ role: "HR_ADMIN" }).join() === "HR" && reviewStagesFor({ role: "EMPLOYEE" }).length === 0);

  /* ---------- people ---------- */
  const one = (where: object) => db.user.findFirstOrThrow({ where: { status: "ACTIVE", ...where }, include: { department: true } });
  const admin = await one({ role: "SUPER_ADMIN" });
  const hr = await one({ role: "HR_ADMIN" });
  const finance = await one({ role: "FINANCE_ADMIN" });
  const auditor = await one({ role: "AUDIT_ADMIN" });
  const head = await one({ role: "DEPARTMENT_HEAD", department: { code: "GA" } });
  const otherHead = await one({ role: "DEPARTMENT_HEAD", department: { code: "MKT" } });
  const employee = await one({ role: "EMPLOYEE", departmentId: head.departmentId });
  const colleague = await one({ role: "EMPLOYEE", departmentId: head.departmentId, NOT: { id: employee.id } });
  const a = (u: { id: string; role: string; departmentId: string | null }): Actor => ({ id: u.id, role: u.role, departmentId: u.departmentId });

  const tasks = (scores = ["9.97", "9.9", "9.9", "9.8", "9.85"]): TaskInput[] =>
    ["Sales Order Preparing", "Invoice Preparing", "Tally Data Management", "Support to Sales Return", "Field Force Coordination"].map((task, i) => ({ task, score: scores[i], remarks: "" }));
  // A year nobody has data for, so the check never collides with real KPIs.
  const sheet = (over: Partial<SheetInput> = {}): SheetInput => ({ year: 2021, month: 7, tasks: tasks(), remarks: "July work", approverId: head.id, ...over });
  const dept = (kpiId: string, over: object = {}) => ({ kpiId, decision: "approve" as const, tasks: tasks(), qualityOfWork: "14.95", timelineOfDeliverables: "19.99", stakeholderPeerReview: "4.95", reason: "", ...over });
  const hrIn = (kpiId: string, over: object = {}) => ({ kpiId, decision: "approve" as const, attendance: "10", hrRemarks: "Verified", hrNote: "No leave", paymentAmount: "12500.505", reason: "", ...over });

  try {
    await db.$transaction(
      async (tx) => {
        const view = async (id: string, viewer: Actor) => toView(await tx.kpi.findUniqueOrThrow({ where: { id }, include: kpiInclude }), viewer);

        /* ---------- Employee ---------- */
        await rejects("HR Admin cannot create a KPI", () => saveSheet(tx, a(hr), sheet(), "draft"));
        await rejects("Super Admin cannot create a KPI", () => saveSheet(tx, a(admin), sheet(), "draft"));
        await rejects("empty draft is refused", () => saveSheet(tx, a(employee), sheet({ tasks: tasks().map(() => ({ task: "", score: "", remarks: "" })) }), "draft"), "task_1");
        await rejects("future month is refused", () => saveSheet(tx, a(employee), sheet({ year: 2099, month: 1 }), "draft"), "period");
        const draft = await saveSheet(tx, a(employee), sheet({ tasks: tasks(["9.97", "", "", "", ""]), approverId: "" }), "draft");
        check("draft saved without approver or all scores", draft.status === "DRAFT" && draft.selfScore === null && draft.currentVersion === 0);
        await rejects("second KPI for the same month is refused", () => saveSheet(tx, a(employee), sheet(), "draft"), "period");
        await rejects("submit needs all five scores", () => saveSheet(tx, a(employee), sheet({ kpiId: draft.id, tasks: tasks(["9.97", "9.9", "", "9.8", "9.85"]) }), "submit"), "score_3");
        await rejects("score above 10 is refused", () => saveSheet(tx, a(employee), sheet({ kpiId: draft.id, tasks: tasks(["11", "9.9", "9.9", "9.8", "9.85"]) }), "submit"), "score_1");
        await rejects("submit needs an Approval Person", () => saveSheet(tx, a(employee), sheet({ kpiId: draft.id, approverId: "" }), "submit"), "approverId");
        await rejects("approver must be a head of the employee's department", () => saveSheet(tx, a(employee), sheet({ kpiId: draft.id, approverId: otherHead.id }), "submit"), "approverId");
        await rejects("someone else's draft cannot be edited", () => saveSheet(tx, a(colleague), sheet({ kpiId: draft.id }), "draft"));
        check("a draft is invisible to the Department Head and HR", !canViewKpi(a(head), { ...draft, owner: employee }) && !canViewKpi(a(hr), { ...draft, owner: employee }));

        let kpi = await saveSheet(tx, a(employee), sheet({ kpiId: draft.id }), "submit");
        check("submitted: version 1, self score 49.42", kpi.status === "SUBMITTED" && kpi.currentVersion === 1 && kpi.selfScore === 49.42 && kpi.tasks.every((t) => t.employeeScore === t.score));
        await rejects("a submitted KPI cannot be changed by the employee", () => saveSheet(tx, a(employee), sheet({ kpiId: kpi.id, remarks: "changed" }), "draft"));
        let own = await view(kpi.id, a(employee));
        check("employee view: nothing from later stages, no payment", !own.showDept && !own.showHr && !own.showPayment && own.kpiScore === null && own.totalScore === null && own.paymentAmount === null);

        /* ---------- Department Head ---------- */
        const scope = { ...kpi, owner: employee };
        check("who can act at the Department Head stage", canActOn(a(head), scope) && canActOn(a(admin), scope) && !canActOn(a(otherHead), scope) && !canActOn(a(hr), scope) && !canActOn(a(finance), scope) && !canActOn(a(employee), scope));
        await rejects("HR Admin cannot approve before the Department Head", () => hrDecide(tx, a(hr), hrIn(kpi.id)));
        await rejects("another department's head cannot approve", () => deptDecide(tx, a(otherHead), dept(kpi.id)));
        await rejects("the employee cannot approve their own KPI", () => deptDecide(tx, a(employee), dept(kpi.id)));
        await rejects("return needs remarks", () => deptDecide(tx, a(head), dept(kpi.id, { decision: "return", reason: "" })), "reason");
        await rejects("Quality of work above 15 is refused", () => deptDecide(tx, a(head), dept(kpi.id, { qualityOfWork: "16" })), "qualityOfWork");
        await rejects("a missing Department Head score is refused", () => deptDecide(tx, a(head), dept(kpi.id, { stakeholderPeerReview: "" })), "stakeholderPeerReview");
        await rejects("changing the breakdown needs Apply Adjustment", () => deptDecide(tx, a(head), dept(kpi.id, { tasks: tasks(["9", "9.9", "9.9", "9.8", "9.85"]) })));
        await rejects("Apply Adjustment needs an actual change", () => deptDecide(tx, a(head), dept(kpi.id, { decision: "adjust", reason: "no change at all" })));

        kpi = await deptDecide(tx, a(head), dept(kpi.id, { decision: "return", reason: "Please add remarks for task 3." }));
        check("returned to the employee", kpi.status === "RETURNED" && kpi.returnRemarks === "Please add remarks for task 3.");
        own = await view(kpi.id, a(employee));
        check("employee sees why it was returned", own.returnRemarks === "Please add remarks for task 3." && own.history.some((h) => h.decision === "DEPT_RETURN" && h.reason));
        await rejects("a returned KPI keeps its month even if another is sent", async () => { const r = await saveSheet(tx, a(employee), sheet({ kpiId: kpi.id, year: 2021, month: 8 }), "submit"); if (r.periodMonth === 7) throw new KpiError("kept"); });
        kpi = await tx.kpi.findUniqueOrThrow({ where: { id: kpi.id }, include: { tasks: { orderBy: { sl: "asc" } } } });
        check("resubmitted as a new version", kpi.status === "SUBMITTED" && kpi.currentVersion === 3 && kpi.returnRemarks === null && kpi.periodMonth === 7);

        kpi = await deptDecide(tx, a(head), dept(kpi.id, { decision: "adjust", tasks: tasks(["9.5", "9.9", "9.9", "9.8", "9.85"]), reason: "Task 1 had two late orders." }));
        check("adjusted and approved: KPI (5) is the new total", kpi.status === "DEPT_APPROVED" && kpi.adjusted && kpi.kpiScore === 48.95 && kpi.selfScore === 49.42 && kpi.tasks[0].score === 9.5 && kpi.tasks[0].employeeScore === 9.97 && kpi.deptDecidedById === head.id);
        own = await view(kpi.id, a(employee));
        check("employee now sees the Department Head's part, not HR's", own.showDept && own.kpiScore === 48.95 && own.qualityOfWork === 14.95 && own.adjustReason === "Task 1 had two late orders." && !own.showHr && own.totalScore === null);
        await rejects("the Department Head cannot decide twice", () => deptDecide(tx, a(head), dept(kpi.id)));

        /* ---------- HR Admin ---------- */
        await rejects("Finance cannot approve before HR", () => financeDecide(tx, a(finance), { kpiId: kpi.id, decision: "approve", note: "", reason: "" }));
        await rejects("the Department Head cannot do the HR part", () => hrDecide(tx, a(head), hrIn(kpi.id)));
        await rejects("Attendance is required", () => hrDecide(tx, a(hr), hrIn(kpi.id, { attendance: "" })), "attendance");
        await rejects("Attendance above 10 is refused", () => hrDecide(tx, a(hr), hrIn(kpi.id, { attendance: "10.5" })), "attendance");
        await rejects("Payment Amount is required", () => hrDecide(tx, a(hr), hrIn(kpi.id, { paymentAmount: "" })), "paymentAmount");
        await rejects("negative payment is refused", () => hrDecide(tx, a(hr), hrIn(kpi.id, { paymentAmount: "-1" })), "paymentAmount");
        await rejects("HR return needs remarks", () => hrDecide(tx, a(hr), hrIn(kpi.id, { decision: "return", reason: "" })), "reason");

        kpi = await hrDecide(tx, a(hr), hrIn(kpi.id, { decision: "return", reason: "Please recheck Stakeholder & Peer Review." }));
        check("returned to the Department Head", kpi.status === "RETURNED_TO_HEAD" && stageOf(kpi.status) === "DEPT");
        check("employee does not see an internal return reason", (await view(kpi.id, a(employee))).returnRemarks === null);
        check("Department Head sees the HR remarks", (await view(kpi.id, a(head))).returnRemarks === "Please recheck Stakeholder & Peer Review.");
        await rejects("after an HR return a changed breakdown still needs Apply Adjustment", () => deptDecide(tx, a(head), dept(kpi.id, { tasks: tasks(["9.5", "9.9", "9.9", "9.8", "9.85"]) })));
        kpi = await deptDecide(tx, a(head), dept(kpi.id, { decision: "adjust", tasks: tasks(["9.5", "9.9", "9.9", "9.8", "9.85"]), stakeholderPeerReview: "5", reason: "Task 1 had two late orders." }));
        check("re-approved by the Department Head", kpi.status === "DEPT_APPROVED" && kpi.stakeholderPeerReview === 5);

        kpi = await hrDecide(tx, a(hr), hrIn(kpi.id));
        check("HR approved: total calculated, payment rounded", kpi.status === "HR_APPROVED" && kpi.totalScore === 98.89 && kpi.attendance === 10 && kpi.paymentAmount === 12500.51 && kpi.hrDecidedById === hr.id, { total: kpi.totalScore, pay: kpi.paymentAmount });
        own = await view(kpi.id, a(employee));
        check("employee sees the Total Score and HR notes, never the payment", own.showHr && own.totalScore === 98.89 && own.hrNote === "No leave" && !own.showPayment && own.paymentAmount === null && own.financeNote === null);
        const headView = await view(kpi.id, a(head));
        check("Department Head does not see the payment", !headView.showPayment && headView.paymentAmount === null && headView.totalScore === 98.89);
        check("HR, Finance, Audit and the Super Admin see the payment", (await view(kpi.id, a(hr))).paymentAmount === 12500.51 && (await view(kpi.id, a(finance))).paymentAmount === 12500.51 && (await view(kpi.id, a(auditor))).paymentAmount === 12500.51 && (await view(kpi.id, a(admin))).paymentAmount === 12500.51);

        /* ---------- Finance Admin ---------- */
        await rejects("Audit cannot approve before Finance", () => auditDecide(tx, a(auditor), { kpiId: kpi.id, decision: "approve", note: "", reason: "" }));
        await rejects("HR cannot do the Finance part", () => financeDecide(tx, a(hr), { kpiId: kpi.id, decision: "approve", note: "", reason: "" }));
        await rejects("Finance return needs remarks", () => financeDecide(tx, a(finance), { kpiId: kpi.id, decision: "return", note: "", reason: "no" }), "reason");
        kpi = await financeDecide(tx, a(finance), { kpiId: kpi.id, decision: "return", note: "", reason: "Payment does not match the slab." });
        check("rejected and returned to HR", kpi.status === "RETURNED_TO_HR" && stageOf(kpi.status) === "HR");
        check("a KPI back with HR is hidden from the employee's score again", (await view(kpi.id, a(employee))).totalScore === null);
        kpi = await hrDecide(tx, a(hr), hrIn(kpi.id, { paymentAmount: "12000" }));
        kpi = await financeDecide(tx, a(finance), { kpiId: kpi.id, decision: "approve", note: "Payroll batch 07", reason: "" });
        check("Finance approved", kpi.status === "FINANCE_APPROVED" && kpi.financeNote === "Payroll batch 07" && kpi.paymentAmount === 12000 && kpi.financeDecidedById === finance.id);

        /* ---------- Audit Admin ---------- */
        await rejects("Finance cannot do the Audit part", () => auditDecide(tx, a(finance), { kpiId: kpi.id, decision: "approve", note: "", reason: "" }));
        kpi = await auditDecide(tx, a(auditor), { kpiId: kpi.id, decision: "return", note: "", reason: "Batch reference missing." });
        check("returned to Finance", kpi.status === "RETURNED_TO_FINANCE" && stageOf(kpi.status) === "FINANCE");
        check("a KPI back with Finance keeps counting (HR's score stands)", (await view(kpi.id, a(employee))).totalScore === 98.89);
        kpi = await financeDecide(tx, a(finance), { kpiId: kpi.id, decision: "approve", note: "Payroll batch 07, ref PV-21", reason: "" });
        kpi = await auditDecide(tx, a(auditor), { kpiId: kpi.id, decision: "approve", note: "Verified", reason: "" });
        check("completed by the Audit Admin", kpi.status === "COMPLETED" && kpi.auditDecidedById === auditor.id && stageOf(kpi.status) === null);
        await rejects("a completed KPI cannot be decided again", () => auditDecide(tx, a(auditor), { kpiId: kpi.id, decision: "return", note: "", reason: "too late now" }));
        await rejects("a completed KPI cannot be edited", () => saveSheet(tx, a(employee), sheet({ kpiId: kpi.id }), "submit"));

        const versions = await tx.kpiVersion.findMany({ where: { kpiId: kpi.id }, orderBy: { versionNo: "asc" } });
        const expected = ["SUBMIT", "DEPT_RETURN", "RESUBMIT", "DEPT_ADJUST", "HR_RETURN", "DEPT_ADJUST", "HR_APPROVE", "FINANCE_RETURN", "HR_APPROVE", "FINANCE_APPROVE", "AUDIT_RETURN", "FINANCE_APPROVE", "AUDIT_APPROVE"];
        check("version history records every step in order", JSON.stringify(versions.map((v) => v.action)) === JSON.stringify(expected) && versions.every((v, i) => v.versionNo === i + 1), versions.map((v) => v.action));
        check("decision history matches", (await tx.reviewDecision.count({ where: { kpiId: kpi.id } })) === expected.length);
        const changes = JSON.parse(versions[3].changes) as { field: string; oldValue: unknown; newValue: unknown }[];
        check("the adjustment records the changed task score", changes.some((c) => c.field === "task1Score" && c.oldValue === 9.97 && c.newValue === 9.5), changes.map((c) => c.field));

        /* ---------- Super Admin override, reject, delete ---------- */
        let second = await saveSheet(tx, a(colleague), sheet(), "submit");
        second = await deptDecide(tx, a(admin), dept(second.id));
        second = await hrDecide(tx, a(admin), hrIn(second.id));
        second = await financeDecide(tx, a(admin), { kpiId: second.id, decision: "approve", note: "", reason: "" });
        second = await auditDecide(tx, a(admin), { kpiId: second.id, decision: "approve", note: "", reason: "" });
        check("the Super Admin can act at every stage", second.status === "COMPLETED" && second.totalScore === 99.31, second.totalScore);

        let third = await saveSheet(tx, a(colleague), sheet({ month: 8 }), "submit");
        third = await deptDecide(tx, a(head), dept(third.id, { decision: "reject", reason: "Wrong month." }));
        check("rejected", third.status === "REJECTED" && third.decisionReason === "Wrong month.");
        const again = await saveSheet(tx, a(colleague), sheet({ month: 8 }), "submit");
        check("after a rejection a new KPI for the month is allowed", again.status === "SUBMITTED" && again.id !== third.id);
        await rejects("the HR Admin cannot delete a KPI", () => deleteKpi(tx, a(hr), again.id, "not allowed"));
        await rejects("delete needs a reason", () => deleteKpi(tx, a(head), again.id, ""), "reason");
        const deleted = await deleteKpi(tx, a(head), again.id, "Submitted by mistake.");
        check("Department Head deleted a KPI waiting for them", !!deleted.deletedAt && deleted.deleteReason === "Submitted by mistake.");
        await rejects("a Department Head cannot delete a KPI that has left them", () => deleteKpi(tx, a(head), second.id, "too late for this"));

        /* ---------- A Department Head's own KPI goes to the Super Admin ---------- */
        await rejects("a Department Head cannot pick another head as approver", () => saveSheet(tx, a(head), sheet({ approverId: otherHead.id }), "submit"), "approverId");
        const headKpi = await saveSheet(tx, a(head), sheet({ approverId: admin.id }), "submit");
        await rejects("a Department Head cannot approve their own KPI", () => deptDecide(tx, a(head), dept(headKpi.id)));
        check("the Super Admin approves a Department Head's KPI", (await deptDecide(tx, a(admin), dept(headKpi.id))).status === "DEPT_APPROVED");

        throw new Rollback();
      },
      { timeout: 600000, maxWait: 20000 },
    );
  } catch (e) {
    if (!(e instanceof Rollback)) { failed++; console.error(e); }
  }
  const left = await db.kpi.count({ where: { periodYear: 2021 } });
  check("rolled back: nothing from the check remains", left === 0, left);
}

main()
  .catch((e) => { failed++; console.error(e); })
  .finally(async () => {
    await db.$disconnect();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
