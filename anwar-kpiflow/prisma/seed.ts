/* eslint-disable no-console */
import { PrismaClient, type Kpi } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BUSINESS_UNITS, DEFAULT_DEPARTMENTS } from "../src/lib/constants";
import { DEMO_PASSWORDS } from "../src/lib/demo";
import { achievementPct, calculatedScore } from "../src/lib/calc";
import { storeBuffer } from "../src/lib/storage";
import { diffKpi, snapshotOf } from "../src/lib/versions";

const db = new PrismaClient();

/* ---------- minimal single-page PDF so evidence downloads open in a viewer ---------- */
function makePdf(lines: string[]): Buffer {
  const text = lines.map((l, i) => `BT /F1 12 Tf 50 ${760 - i * 18} Td (${l.replace(/[()\\]/g, "")}) Tj ET`).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const daysAgo = (n: number, h = 10) => new Date(Date.now() - n * 86400000 - (24 - h) * 3600000 + 6 * 3600000);

type Spec = {
  owner: string; approver: string; name: string; category: "PROJECT" | "PEOPLE_CULTURE"; year: number; month: number;
  target: number; actual: number; unit: string; weight: number; remarks: string;
  status: "SUBMITTED" | "RETURNED" | "APPROVED" | "ADJUSTED" | "REJECTED";
  adjust?: { finalScore?: number; weight?: number; reason: string };
  reason?: string; submittedDaysAgo: number; resubmitted?: boolean;
};

async function main() {
  console.log("Seeding Anwar KPIFlow…");
  await db.$transaction([
    db.auditLog.deleteMany(), db.emailLog.deleteMany(), db.reviewDecision.deleteMany(), db.kpiVersion.deleteMany(),
    db.evidenceFile.deleteMany(), db.kpi.deleteMany(), db.accountToken.deleteMany(), db.user.deleteMany(),
    db.department.deleteMany(), db.businessUnit.deleteMany(), db.setting.deleteMany(),
  ]);

  const units = Object.fromEntries(await Promise.all(BUSINESS_UNITS.map(async (u) => [u.code, await db.businessUnit.create({ data: u })] as const)));
  const depts = Object.fromEntries(await Promise.all(DEFAULT_DEPARTMENTS.map(async (d) => [d.code, await db.department.create({ data: d })] as const)));

  const hash = async (p: string) => bcrypt.hash(p, 10);
  const [adminHash, headHash, userHash] = await Promise.all([hash(DEMO_PASSWORDS.SUPER_ADMIN), hash(DEMO_PASSWORDS.DEPARTMENT_HEAD), hash(DEMO_PASSWORDS.EMPLOYEE)]);

  const mk = (fullName: string, email: string, employeeId: string, role: string, bu: string, dept: string | null, designation: string, passwordHash: string | null, status = "ACTIVE") =>
    db.user.create({ data: { fullName, email, employeeId, role, designation, passwordHash, status, businessUnitId: units[bu].id, departmentId: dept ? depts[dept].id : null, corporatePhone: passwordHash ? "+880 1711 000" + employeeId.slice(-3) : null } });

  const U: Record<string, Awaited<ReturnType<typeof mk>>> = {};
  U.admin = await mk("Sarwar Hossain", "superadmin@anwargroup.net", "AG-0001", "SUPER_ADMIN", "ATECH", null, "Group Head of Performance", adminHash);
  U.sysadmin = await mk("Tanjila Hoque", "sysadmin@anwargroup.net", "AG-0002", "SYSTEM_ADMIN", "ATECH", null, "System Administrator", adminHash);
  U.nasrin = await mk("Nasrin Islam", "nasrin.islam@anwargroup.net", "AG-0101", "DEPARTMENT_HEAD", "ATECH", "GA", "Head of Growth Analytics", headHash);
  U.kamal = await mk("Kamal Hasan", "kamal.hasan@anwargroup.net", "AG-0102", "DEPARTMENT_HEAD", "ATECH", "GA", "Deputy Head, Growth Analytics", headHash);
  U.farhana = await mk("Farhana Rahman", "farhana.rahman@anwargroup.net", "AG-0201", "DEPARTMENT_HEAD", "ACL", "HR", "Head of Human Resources", headHash);
  U.imran = await mk("Imran Chowdhury", "imran.chowdhury@anwargroup.net", "AG-0301", "DEPARTMENT_HEAD", "AIL", "MKT", "Head of Marketing", headHash);
  // Growth Analytics employees
  U.rafi = await mk("Rafi Ahmed", "rafi.ahmed@anwargroup.net", "AG-1042", "EMPLOYEE", "ATECH", "GA", "Sales Executive", userHash);
  U.sadia = await mk("Sadia Noor", "sadia.noor@anwargroup.net", "AG-1057", "EMPLOYEE", "ACL", "GA", "Account Manager", userHash);
  U.shuvo = await mk("Shuvo Rahman", "shuvo.rahman@anwargroup.net", "AG-1063", "EMPLOYEE", "AGL", "GA", "Client Relations Officer", userHash);
  U.mahin = await mk("Mahin Chowdhury", "mahin.chowdhury@anwargroup.net", "AG-1078", "EMPLOYEE", "AOPL", "GA", "Sales Associate", userHash);
  // HR employees
  U.tania = await mk("Tania Karim", "tania.karim@anwargroup.net", "AG-2011", "EMPLOYEE", "ACL", "HR", "HR Officer", userHash);
  U.nusrat = await mk("Nusrat Jahan", "nusrat.jahan@anwargroup.net", "AG-2019", "EMPLOYEE", "ATX", "HR", "Talent Acquisition Specialist", userHash);
  U.arif = await mk("Arif Hossain", "arif.hossain@anwargroup.net", "AG-2024", "EMPLOYEE", "AJSM", "HR", "L&D Coordinator", userHash);
  // Marketing employees
  U.mehedi = await mk("Mehedi Hasan", "mehedi.hasan@anwargroup.net", "AG-3005", "EMPLOYEE", "AIL", "MKT", "Brand Executive", userHash);
  U.sumaiya = await mk("Sumaiya Akter", "sumaiya.akter@anwargroup.net", "AG-3012", "EMPLOYEE", "ALM", "MKT", "Digital Marketing Specialist", userHash);
  // Finance & Supply Chain employees (departments whose head is still being invited)
  U.jannatul = await mk("Jannatul Ferdous", "jannatul.ferdous@anwargroup.net", "AG-4001", "EMPLOYEE", "AORG", "SCM", "Procurement Officer", userHash);
  U.tanvir = await mk("Tanvir Alam", "tanvir.alam@anwargroup.net", "AG-5003", "EMPLOYEE", "ACSL", "FIN", "Accounts Executive", userHash);
  // Pending invitation (shows invitation status, resend and the Outbox)
  const pendingHead = await mk("Rezaul Karim", "rezaul.karim@anwargroup.net", "AG-0401", "DEPARTMENT_HEAD", "ACSL", "FIN", "Head of Finance & Accounts", null, "PENDING_SETUP");
  for (const p of [pendingHead]) {
    const token = [...Array(64)].map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
    const type = p.role === "DEPARTMENT_HEAD" ? "INVITATION" : "SIGNUP";
    await db.accountToken.create({ data: { token, type, userId: p.id, invitedById: U.admin.id, expiresAt: new Date(Date.now() + 48 * 3600000) } });
    const link = `${process.env.APP_URL ?? "http://localhost:3000"}/setup-password?token=${token}`;
    await db.emailLog.create({
      data: {
        toEmail: p.email,
        subject: type === "INVITATION" ? "You have been invited to Anwar KPIFlow as a Department Head" : "Set up your Anwar KPIFlow account",
        body: `Hello ${p.fullName},\n\n${type === "INVITATION" ? "The Super Admin has invited you to Anwar KPIFlow as a Department Head." : "Your Anwar KPIFlow account has been created."} Use the secure link below to set your password. The link is single-use and expires in 48 hours.\n\n${link}\n\nAnwar KPIFlow · Anwar Group of Industries`,
        link,
      },
    });
    await db.auditLog.create({ data: { userId: U.admin.id, action: type === "INVITATION" ? "DEPARTMENT_HEAD_INVITED" : "EMPLOYEE_ADDED", entityType: "User", entityId: p.id, details: JSON.stringify({ email: p.email }) } });
  }

  /* ---------- KPI specs (today is late Sep 2026; current month = September) ---------- */
  const Y = 2026;
  const specs: Spec[] = [
    // Rafi — Growth Analytics (reference employee)
    { owner: "rafi", approver: "nasrin", name: "Upsell Revenue", category: "PROJECT", year: Y, month: 9, target: 500000, actual: 610000, unit: "BDT", weight: 15, remarks: "Incremental revenue from existing accounts, per August invoicing report.", status: "SUBMITTED", submittedDaysAgo: 3 },
    { owner: "rafi", approver: "nasrin", name: "Proposal Turnaround Days", category: "PROJECT", year: Y, month: 9, target: 5, actual: 4, unit: "days", weight: 10, remarks: "Average business days from request to proposal sent.", status: "SUBMITTED", submittedDaysAgo: 2 },
    { owner: "rafi", approver: "nasrin", name: "New Client Acquisitions", category: "PROJECT", year: Y, month: 9, target: 12, actual: 10, unit: "clients", weight: 25, remarks: "Signed contracts in CRM, exported 25 Sep.", status: "APPROVED", submittedDaysAgo: 6 },
    { owner: "rafi", approver: "nasrin", name: "Client Complaint Rate", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 5, actual: 3, unit: "per 100", weight: 20, remarks: "Complaints per 100 active clients from the support desk.", status: "ADJUSTED", adjust: { finalScore: 120, reason: "Inverse KPI (lower is better). Score capped at 120 per department practice until OI-03 is decided." }, submittedDaysAgo: 8 },
    { owner: "rafi", approver: "nasrin", name: "Team Collaboration Rating", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 4, actual: 3, unit: "of 5", weight: 25, remarks: "Peer review rating from the quarterly survey.", status: "RETURNED", reason: "Please attach the survey export as evidence and confirm the rating scale used.", submittedDaysAgo: 4 },
    { owner: "rafi", approver: "nasrin", name: "Monthly Sales", category: "PROJECT", year: Y, month: 8, target: 10000000, actual: 9833486.62, unit: "BDT", weight: 30, remarks: "Total invoiced sales for August.", status: "APPROVED", submittedDaysAgo: 32 },
    { owner: "rafi", approver: "nasrin", name: "Upsell Revenue", category: "PROJECT", year: Y, month: 8, target: 450000, actual: 402000, unit: "BDT", weight: 15, remarks: "August upsell revenue.", status: "APPROVED", submittedDaysAgo: 33 },
    { owner: "rafi", approver: "nasrin", name: "New Client Acquisitions", category: "PROJECT", year: Y, month: 8, target: 10, actual: 7, unit: "clients", weight: 25, remarks: "August signed contracts.", status: "APPROVED", submittedDaysAgo: 34 },
    { owner: "rafi", approver: "nasrin", name: "Proposal Turnaround Days", category: "PROJECT", year: Y, month: 8, target: 5, actual: 6, unit: "days", weight: 10, remarks: "August turnaround.", status: "APPROVED", submittedDaysAgo: 35 },
    { owner: "rafi", approver: "kamal", name: "Territory Expansion", category: "PROJECT", year: Y, month: 7, target: 3, actual: 3, unit: "districts", weight: 20, remarks: "New districts activated in July.", status: "APPROVED", submittedDaysAgo: 62 },
    { owner: "rafi", approver: "nasrin", name: "Monthly Sales", category: "PROJECT", year: Y, month: 7, target: 9500000, actual: 9120000, unit: "BDT", weight: 30, remarks: "July invoiced sales.", status: "APPROVED", submittedDaysAgo: 63 },
    { owner: "rafi", approver: "nasrin", name: "Monthly Sales", category: "PROJECT", year: Y, month: 6, target: 9000000, actual: 8650000, unit: "BDT", weight: 30, remarks: "June invoiced sales.", status: "APPROVED", submittedDaysAgo: 95 },
    { owner: "rafi", approver: "nasrin", name: "New Client Acquisitions", category: "PROJECT", year: Y, month: 5, target: 10, actual: 11, unit: "clients", weight: 25, remarks: "May signed contracts.", status: "APPROVED", submittedDaysAgo: 125 },
    { owner: "rafi", approver: "nasrin", name: "Monthly Sales", category: "PROJECT", year: Y, month: 4, target: 8500000, actual: 7900000, unit: "BDT", weight: 30, remarks: "April invoiced sales.", status: "APPROVED", submittedDaysAgo: 156 },
    { owner: "rafi", approver: "nasrin", name: "Annual Account Retention", category: "PROJECT", year: 2025, month: 12, target: 95, actual: 91, unit: "%", weight: 40, remarks: "Retention across managed accounts, FY2025.", status: "APPROVED", submittedDaysAgo: 280 },
    { owner: "rafi", approver: "nasrin", name: "Monthly Sales", category: "PROJECT", year: 2025, month: 11, target: 8000000, actual: 8420000, unit: "BDT", weight: 30, remarks: "November 2025 sales.", status: "APPROVED", submittedDaysAgo: 300 },

    // Sadia — GA
    { owner: "sadia", approver: "nasrin", name: "Key Account Growth", category: "PROJECT", year: Y, month: 9, target: 2000000, actual: 1934000, unit: "BDT", weight: 30, remarks: "Growth in top 10 accounts vs. last quarter.", status: "SUBMITTED", submittedDaysAgo: 5 },
    { owner: "sadia", approver: "nasrin", name: "Account Renewals", category: "PROJECT", year: Y, month: 9, target: 20, actual: 19, unit: "accounts", weight: 25, remarks: "Renewal contracts countersigned in September.", status: "APPROVED", submittedDaysAgo: 9 },
    { owner: "sadia", approver: "nasrin", name: "Mentoring Sessions Delivered", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 4, actual: 4, unit: "sessions", weight: 15, remarks: "Onboarding mentoring for new associates.", status: "APPROVED", submittedDaysAgo: 10 },
    { owner: "sadia", approver: "nasrin", name: "Key Account Growth", category: "PROJECT", year: Y, month: 8, target: 1800000, actual: 1710000, unit: "BDT", weight: 30, remarks: "August key account growth.", status: "APPROVED", submittedDaysAgo: 36 },
    { owner: "sadia", approver: "nasrin", name: "Account Renewals", category: "PROJECT", year: Y, month: 7, target: 18, actual: 18, unit: "accounts", weight: 25, remarks: "July renewals.", status: "APPROVED", submittedDaysAgo: 64 },

    // Shuvo — GA
    { owner: "shuvo", approver: "nasrin", name: "Escalation Rate", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 8, actual: 11, unit: "per 100", weight: 20, remarks: "Escalations per 100 tickets (lower is better).", status: "SUBMITTED", submittedDaysAgo: 4 },
    { owner: "shuvo", approver: "kamal", name: "Customer Satisfaction Rating", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 90, actual: 54, unit: "%", weight: 30, remarks: "CSAT survey September, 212 responses.", status: "SUBMITTED", submittedDaysAgo: 6 },
    { owner: "shuvo", approver: "nasrin", name: "Client Visits Completed", category: "PROJECT", year: Y, month: 9, target: 24, actual: 15, unit: "visits", weight: 25, remarks: "Logged in CRM.", status: "APPROVED", submittedDaysAgo: 12 },
    { owner: "shuvo", approver: "nasrin", name: "Client Visits Completed", category: "PROJECT", year: Y, month: 8, target: 24, actual: 16, unit: "visits", weight: 25, remarks: "August visits.", status: "APPROVED", submittedDaysAgo: 38 },
    { owner: "shuvo", approver: "nasrin", name: "Response SLA Compliance", category: "PROJECT", year: Y, month: 8, target: 95, actual: 71, unit: "%", weight: 30, remarks: "Tickets answered within SLA.", status: "REJECTED", reason: "Evidence report covers July, not August. Please submit a KPI for the correct month with the matching export.", submittedDaysAgo: 30 },

    // Mahin — GA
    { owner: "mahin", approver: "nasrin", name: "New Retail Outlets", category: "PROJECT", year: Y, month: 9, target: 15, actual: 8, unit: "outlets", weight: 30, remarks: "Outlets onboarded with first order placed.", status: "SUBMITTED", submittedDaysAgo: 7 },
    { owner: "mahin", approver: "kamal", name: "Route Coverage", category: "PROJECT", year: Y, month: 9, target: 100, actual: 62, unit: "%", weight: 20, remarks: "Planned routes visited.", status: "APPROVED", submittedDaysAgo: 11 },
    { owner: "mahin", approver: "nasrin", name: "Warehouse Cost per Unit", category: "PROJECT", year: Y, month: 9, target: 12, actual: 14.5, unit: "BDT", weight: 15, remarks: "Cost per unit dispatched (lower is better).", status: "SUBMITTED", submittedDaysAgo: 9 },
    { owner: "mahin", approver: "nasrin", name: "Route Coverage", category: "PROJECT", year: Y, month: 8, target: 100, actual: 58, unit: "%", weight: 20, remarks: "August coverage.", status: "ADJUSTED", adjust: { finalScore: 50, weight: 25, reason: "Two routes were closed by flooding; weight raised to 25% and score set at 50 to reflect the recoverable portion." }, submittedDaysAgo: 37 },

    // Nasrin — Department Head's own KPIs (approved by Super Admin)
    { owner: "nasrin", approver: "admin", name: "Department Revenue Target", category: "PROJECT", year: Y, month: 9, target: 25000000, actual: 23900000, unit: "BDT", weight: 50, remarks: "Consolidated Growth Analytics revenue.", status: "SUBMITTED", submittedDaysAgo: 2 },
    { owner: "nasrin", approver: "admin", name: "Team Attrition Rate", category: "PEOPLE_CULTURE", year: Y, month: 8, target: 5, actual: 2, unit: "%", weight: 25, remarks: "Voluntary exits vs. headcount.", status: "APPROVED", submittedDaysAgo: 31 },

    // HR — Tania, Nusrat, Arif (approver Farhana)
    { owner: "tania", approver: "farhana", name: "Time to Hire", category: "PROJECT", year: Y, month: 9, target: 30, actual: 26, unit: "days", weight: 30, remarks: "Average days from requisition to offer acceptance.", status: "SUBMITTED", submittedDaysAgo: 3 },
    { owner: "tania", approver: "farhana", name: "Onboarding Completion", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 100, actual: 96, unit: "%", weight: 25, remarks: "New joiners completing the 30-day onboarding plan.", status: "APPROVED", submittedDaysAgo: 8 },
    { owner: "tania", approver: "farhana", name: "Policy Training Coverage", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 250, actual: 214, unit: "staff", weight: 20, remarks: "Staff trained on the updated code of conduct.", status: "RETURNED", reason: "Attendance sheet is unsigned. Please attach the signed LMS export.", submittedDaysAgo: 5 },
    { owner: "tania", approver: "farhana", name: "Time to Hire", category: "PROJECT", year: Y, month: 8, target: 30, actual: 33, unit: "days", weight: 30, remarks: "August time to hire.", status: "APPROVED", submittedDaysAgo: 34 },
    { owner: "tania", approver: "farhana", name: "Onboarding Completion", category: "PEOPLE_CULTURE", year: Y, month: 8, target: 100, actual: 100, unit: "%", weight: 25, remarks: "August onboarding.", status: "APPROVED", submittedDaysAgo: 35 },
    { owner: "tania", approver: "farhana", name: "Onboarding Completion", category: "PEOPLE_CULTURE", year: Y, month: 7, target: 100, actual: 92, unit: "%", weight: 25, remarks: "July onboarding.", status: "APPROVED", submittedDaysAgo: 66 },
    { owner: "nusrat", approver: "farhana", name: "Offer Acceptance Rate", category: "PROJECT", year: Y, month: 9, target: 85, actual: 88, unit: "%", weight: 40, remarks: "Offers accepted / offers made.", status: "APPROVED", submittedDaysAgo: 9 },
    { owner: "nusrat", approver: "farhana", name: "Sourcing Pipeline", category: "PROJECT", year: Y, month: 9, target: 120, actual: 97, unit: "candidates", weight: 30, remarks: "Qualified candidates added to the ATS.", status: "SUBMITTED", submittedDaysAgo: 4 },
    { owner: "arif", approver: "farhana", name: "Training Hours Delivered", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 400, actual: 312, unit: "hours", weight: 50, remarks: "Classroom and e-learning hours logged in LMS.", status: "APPROVED", submittedDaysAgo: 10 },
    { owner: "arif", approver: "farhana", name: "Training Satisfaction", category: "PEOPLE_CULTURE", year: Y, month: 8, target: 4.5, actual: 4.6, unit: "of 5", weight: 30, remarks: "Post-session survey average.", status: "APPROVED", submittedDaysAgo: 36 },

    // Marketing — Mehedi, Sumaiya (approver Imran)
    { owner: "mehedi", approver: "imran", name: "Campaign Reach", category: "PROJECT", year: Y, month: 9, target: 1500000, actual: 1725000, unit: "people", weight: 40, remarks: "Combined reach across the Anwar Cement monsoon campaign.", status: "APPROVED", submittedDaysAgo: 7 },
    { owner: "mehedi", approver: "imran", name: "Dealer Event Attendance", category: "PEOPLE_CULTURE", year: Y, month: 9, target: 300, actual: 268, unit: "dealers", weight: 20, remarks: "Registered attendance at the Q3 dealer meet.", status: "SUBMITTED", submittedDaysAgo: 3 },
    { owner: "sumaiya", approver: "imran", name: "Website Leads", category: "PROJECT", year: Y, month: 9, target: 800, actual: 910, unit: "leads", weight: 35, remarks: "Qualified leads from web forms (HubSpot export).", status: "APPROVED", submittedDaysAgo: 8 },
    { owner: "sumaiya", approver: "imran", name: "Cost per Lead", category: "PROJECT", year: Y, month: 8, target: 150, actual: 172, unit: "BDT", weight: 25, remarks: "Paid media spend / leads (lower is better).", status: "APPROVED", submittedDaysAgo: 33 },
  ];

  let created = 0;
  for (const s of specs) {
    const owner = U[s.owner];
    const approver = U[s.approver];
    const submittedAt = daysAgo(s.submittedDaysAgo, 11);
    const ach = achievementPct(s.target, s.actual);
    const score = calculatedScore(ach);

    const pdf = makePdf([
      "Anwar Group of Industries - Evidence Report",
      `KPI: ${s.name}`,
      `Owner: ${owner.fullName} (${owner.employeeId})`,
      `Period: ${s.year}-${String(s.month).padStart(2, "0")}`,
      `Target: ${s.target} ${s.unit}   Actual: ${s.actual} ${s.unit}`,
      "",
      "This document was generated for the Anwar KPIFlow prototype.",
    ]);
    const stored = await storeBuffer(`evidence-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${s.year}-${String(s.month).padStart(2, "0")}.pdf`, "application/pdf", pdf);

    let kpi: Kpi = await db.kpi.create({
      data: {
        name: s.name, category: s.category, periodYear: s.year, periodMonth: s.month, target: s.target, actual: s.actual, unit: s.unit, weight: s.weight,
        achievement: ach, calculatedScore: score, status: "SUBMITTED", remarks: s.remarks, ownerId: owner.id, approverId: approver.id,
        submittedAt, createdAt: submittedAt, currentVersion: 1,
        evidence: { create: { ...stored, uploadedById: owner.id, createdAt: submittedAt } },
      },
    });
    await db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: 1, action: "SUBMIT", snapshot: snapshotOf(kpi), changes: "[]", changedById: owner.id, createdAt: submittedAt } });
    await db.auditLog.create({ data: { userId: owner.id, action: "KPI_SUBMITTED", entityType: "Kpi", entityId: kpi.id, details: JSON.stringify({ name: s.name }), createdAt: submittedAt } });

    if (s.status !== "SUBMITTED") {
      const decidedAt = new Date(submittedAt.getTime() + (1 + (created % 3)) * 86400000);
      const before = kpi;
      const actionMap = { APPROVED: "APPROVE", ADJUSTED: "ADJUST", RETURNED: "RETURN", REJECTED: "REJECT" } as const;
      const action = actionMap[s.status];
      const data: Partial<Kpi> = { status: s.status, decidedAt, currentVersion: 2 };
      if (s.status === "APPROVED") data.finalScore = score;
      if (s.status === "ADJUSTED") {
        data.finalScore = s.adjust?.finalScore ?? score;
        if (s.adjust?.weight) data.weight = s.adjust.weight;
        data.decisionReason = s.adjust?.reason;
      }
      if (s.status === "RETURNED") { data.returnRemarks = s.reason; data.decisionReason = s.reason; }
      if (s.status === "REJECTED") data.decisionReason = s.reason;
      kpi = await db.kpi.update({ where: { id: kpi.id }, data });
      const reason = s.status === "ADJUSTED" ? s.adjust?.reason : s.reason;
      await db.kpiVersion.create({ data: { kpiId: kpi.id, versionNo: 2, action, snapshot: snapshotOf(kpi), changes: JSON.stringify(diffKpi(before, kpi)), reason, changedById: approver.id, createdAt: decidedAt } });
      await db.reviewDecision.create({ data: { kpiId: kpi.id, reviewerId: approver.id, decision: action, reason, createdAt: decidedAt } });
      await db.auditLog.create({ data: { userId: approver.id, action: `KPI_${s.status}`, entityType: "Kpi", entityId: kpi.id, details: JSON.stringify({ reason: reason ?? null, finalScore: kpi.finalScore }), createdAt: decidedAt } });
    }
    created++;
  }

  await db.setting.createMany({ data: [{ key: "leaderboard.high", value: "90" }, { key: "leaderboard.middle", value: "70" }, { key: "session.hours", value: "12" }] });
  for (const u of [U.admin, U.nasrin, U.rafi, U.tania, U.farhana]) {
    await db.auditLog.create({ data: { userId: u.id, action: "LOGIN", entityType: "User", entityId: u.id, createdAt: daysAgo(1, 9) } });
  }

  console.log(`Seeded ${Object.keys(units).length} business units, ${Object.keys(depts).length} departments, ${Object.keys(U).length + 2} users, ${created} KPIs.`);
  console.log("\nDemo credentials:");
  console.log(`  Super Admin       superadmin@anwargroup.net      ${DEMO_PASSWORDS.SUPER_ADMIN}`);
  console.log(`  System Admin      sysadmin@anwargroup.net        ${DEMO_PASSWORDS.SUPER_ADMIN}`);
  console.log(`  Department Head   nasrin.islam@anwargroup.net    ${DEMO_PASSWORDS.DEPARTMENT_HEAD}  (Growth Analytics)`);
  console.log(`  Department Head   kamal.hasan@anwargroup.net     ${DEMO_PASSWORDS.DEPARTMENT_HEAD}  (Growth Analytics, 2nd head)`);
  console.log(`  Department Head   farhana.rahman@anwargroup.net  ${DEMO_PASSWORDS.DEPARTMENT_HEAD}  (Human Resources)`);
  console.log(`  Employee          rafi.ahmed@anwargroup.net      ${DEMO_PASSWORDS.EMPLOYEE}  (Growth Analytics)`);
  console.log(`  Employee          tania.karim@anwargroup.net     ${DEMO_PASSWORDS.EMPLOYEE}  (Human Resources)`);
  console.log(`  ...and every other employee listed in docs/DEMO_ACCOUNTS.md with password ${DEMO_PASSWORDS.EMPLOYEE}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
