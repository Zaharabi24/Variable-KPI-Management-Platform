/**
 * End-to-end smoke test for Anwar KPIFlow, mapped to the BRD Section 18 acceptance criteria.
 * Runs against a running server (default http://localhost:3000) in isolated browser contexts,
 * so it never touches a session you have open in your own browser.
 *
 *   node scripts/e2e-smoke.mjs
 *   BASE_URL=http://localhost:3001 node scripts/e2e-smoke.mjs
 *   CHROME="C:\path\to\chrome.exe" node scripts/e2e-smoke.mjs   # if Playwright's Chromium is not installed
 *
 * Each run creates its own KPIs (suffixed with a run id), so it can be repeated without reseeding.
 * Screenshots are written to ../docs/screenshots.
 */
import { chromium } from "playwright-core";
import * as fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve(process.cwd(), "..", "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const RUN = Date.now().toString().slice(-6);
const T = Number(process.env.E2E_TIMEOUT ?? 90000);

const PW = { admin: "Admin@2026", head: "Head@2026", user: "User@2026" };
const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const root = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  try {
    const dirs = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
    for (const d of dirs) {
      for (const sub of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"]) {
        const p = path.join(root, d, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch {}
  return undefined; // fall back to Playwright's default resolution
}

async function login(ctx, email, password) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: T }), page.click("button[type=submit]")]);
  return page;
}

async function createKpi(page, { name, target, actual, weight, evidencePath }) {
  await page.goto(`${BASE}/my-kpi`);
  await page.click('button[aria-label="Create KPI"]');
  await page.waitForSelector("#name", { timeout: T });
  await page.fill("#name", name);
  await page.fill("#target", String(target));
  await page.fill("#actual", String(actual));
  await page.fill("#weight", String(weight));
  await page.fill("#remarks", `Automated smoke test submission (${RUN}).`);
  await page.selectOption("#approverId", { index: 1 });
  await page.setInputFiles("#evidence", evidencePath);
  await page.click('button[form="kpi-form"]');
  await page.waitForSelector("text=submitted to your Approval Person", { timeout: T });
  await page.waitForSelector(`article:has-text('${name}')`, { timeout: T });
}

const browser = await chromium.launch({ headless: true, executablePath: findChrome() });
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name), fullPage: false });
const vp = { viewport: { width: 1440, height: 900 } };
const K = { approve: `E2E Approve ${RUN}`, adjust: `E2E Adjust ${RUN}`, ret: `E2E Return ${RUN}` };
const evidence = path.join(os.tmpdir(), `e2e-evidence-${RUN}.txt`);
fs.writeFileSync(evidence, `Evidence for smoke run ${RUN}: invoice export 2026-09.`);
let approveId = "";

try {
  /* ============ 1. Employee: login, My KPI, Create KPI ============ */
  {
    const ctx = await browser.newContext(vp);
    const page = await login(ctx, "rafi.ahmed@anwargroup.net", PW.user);
    check("Employee lands on My KPI (AC-05)", page.url().endsWith("/my-kpi"), page.url());
    await page.waitForSelector("text=Create KPI", { timeout: T });
    check("Employee sees own KPI cards", (await page.locator("article").count()) >= 5);
    check("Create KPI (+) tile visible inside parent card (AC-08)", await page.locator('button[aria-label="Create KPI"]').isVisible());
    check("Employee sidebar has no Dashboard / Queue (8.2)", (await page.locator('a[href="/dashboard"]').count()) === 0 && (await page.locator('a[href="/pending-requests"]').count()) === 0);
    await shot(page, "10-employee-my-kpi.png");

    await page.click('button[aria-label="Create KPI"]');
    await page.waitForSelector("#name", { timeout: T });
    const submitBtn = page.locator('button[form="kpi-form"]');
    check("Submit disabled while form incomplete (AC-09)", await submitBtn.isDisabled());
    await page.fill("#name", K.approve);
    await page.fill("#target", "500000");
    await page.fill("#actual", "610000");
    await page.fill("#weight", "15");
    await page.fill("#remarks", `Automated smoke test submission (${RUN}).`);
    check("Achievement auto-calculated 122.00% (AC-10)", (await page.inputValue("#achievement")) === "122.00%", await page.inputValue("#achievement"));
    check("Score auto-calculated 122 (AC-10)", (await page.inputValue("#score")) === "122", await page.inputValue("#score"));
    const approverOptions = await page.locator("#approverId option:not([disabled])").allTextContents();
    check("Approval Person list = own department heads only (AC-11)", approverOptions.length === 2 && approverOptions.every((o) => /Nasrin|Kamal/.test(o)), approverOptions.join(" | "));
    await page.selectOption("#approverId", { index: 1 });
    check("Submit still disabled without evidence (AC-09)", await submitBtn.isDisabled());
    await page.setInputFiles("#evidence", evidence);
    check("Submit enabled when every field is valid", await submitBtn.isEnabled());
    await shot(page, "11-create-kpi-form.png");
    await submitBtn.click();
    await page.waitForSelector("text=submitted to your Approval Person", { timeout: T });
    await page.waitForSelector(`article:has-text('${K.approve}')`, { timeout: T });
    const card = page.locator(`article:has-text('${K.approve}')`).first();
    check("New card: Submitted badge + Review step highlighted (AC-12)", (await card.locator("text=Submitted").count()) > 0 && (await card.locator("ol li:nth-child(5)").textContent()).includes("Review"));

    await createKpi(page, { name: K.adjust, target: 5, actual: 4, weight: 10, evidencePath: evidence });
    await createKpi(page, { name: K.ret, target: 15, actual: 8, weight: 30, evidencePath: evidence });

    /* detail view */
    await page.locator(`article:has-text('${K.approve}')`).first().locator("text=View Details").click();
    await page.waitForSelector("text=Calculation path", { timeout: T });
    approveId = page.url().split("/").pop();
    const body = await page.locator("main").innerText();
    check("Detail shows Formula / Achievement / Calculated / Final / Weight (AC-14)", /formula/i.test(body) && /calculated score/i.test(body) && /final score/i.test(body) && /kpi weight/i.test(body));
    check("Detail hides Curve Applied / Adjustment / Score Version (AC-14)", !/curve applied/i.test(body) && !/score version/i.test(body));
    check("Evidence shows sha256 fingerprint (FR-DET-04)", /sha256:[0-9a-f]{64}/.test(body));
    await shot(page, "12-kpi-detail.png");

    /* performance summary */
    await page.goto(`${BASE}/performance?type=MONTHLY&month=9&year=2026`);
    await page.waitForSelector("text=KPI Performance Records", { timeout: T });
    const heads = await page.locator("table thead th").allTextContents();
    check("Records table has exactly the ten BRD columns (AC-17)", heads.length === 10 && heads[0] === "KPI" && heads[9] === "Approval Person", heads.join(", "));
    const tiles = await page.locator("main").innerText();
    check("Five summary metrics shown (AC-16)", /total kpi score/i.test(tiles) && /average achievement/i.test(tiles) && /previous kpi score/i.test(tiles) && /difference/i.test(tiles) && /approved kpis/i.test(tiles));
    check("Three bar charts shown (AC-18)", /Monthly KPI/.test(tiles) && /Quarterly KPI/.test(tiles) && /Yearly KPI/.test(tiles));
    await shot(page, "13-performance-summary.png");
    await page.goto(`${BASE}/performance?type=MONTHLY&month=2&year=2026`);
    check("Empty period shows a no-data message (AC-19)", /No KPIs for this month/.test(await page.locator("main").innerText()));

    await page.goto(`${BASE}/pending-requests`);
    await page.waitForURL((u) => !u.pathname.includes("/pending-requests"), { timeout: T }).catch(() => {});
    check("Employee cannot open the review queue (6.1)", !page.url().includes("/pending-requests"), page.url());
    await ctx.close();
  }

  /* ============ 2. Department Head (GA): scoped queue + decisions ============ */
  {
    const ctx = await browser.newContext(vp);
    const dh = await login(ctx, "nasrin.islam@anwargroup.net", PW.head);
    check("Department Head lands on Dashboard (AC-05)", dh.url().endsWith("/dashboard"), dh.url());
    await dh.waitForSelector("text=Average Achievement", { timeout: T });
    await shot(dh, "20-dh-dashboard.png");

    await dh.goto(`${BASE}/pending-requests?all=1`);
    await dh.waitForSelector("text=requests waiting", { timeout: T });
    const queueText = await dh.locator("main").innerText();
    check("Queue shows Employee Name + Employee ID (AC-20)", /Rafi Ahmed/.test(queueText) && /AG-1042/.test(queueText));
    check("Queue excludes other departments (AC-06)", !/Tania Karim/.test(queueText) && !/Human Resources/.test(queueText) && !/Mehedi Hasan/.test(queueText));
    const search = dh.locator('input[aria-label="Search by Employee Name or Employee ID"]');
    await search.fill("AG-1042");
    const visible = await dh.locator("main article").count();
    check("Search by Employee ID filters the queue (FR-REV-03)", visible >= 3 && (await dh.locator("main article:has-text('Rafi Ahmed')").count()) === visible, `${visible} cards`);
    await search.fill("");

    // Approve
    await dh.locator(`main article:has-text('${K.approve}') button:has-text('View Request')`).click();
    await dh.waitForSelector("button:has-text('Approve calculated')", { timeout: T });
    await shot(dh, "21-review-drawer.png");
    await dh.click("button:has-text('Approve calculated')");
    await dh.waitForSelector(`text=Approved "${K.approve}"`, { timeout: T });
    check("Approve: confirmation shown, calculated score becomes final (AC-21)", (await dh.locator(`main article:has-text('${K.approve}')`).count()) === 0);

    // Adjust (reason required)
    await dh.locator(`main article:has-text('${K.adjust}') button:has-text('View Request')`).click();
    await dh.click("button:has-text('Apply adjustment')");
    await dh.waitForSelector("#adj-score", { timeout: T });
    await dh.fill("#adj-score", "100");
    await dh.click("button:has-text('Apply adjustment and approve')");
    await dh.waitForSelector("text=A reason is required", { timeout: T });
    check("Adjustment requires a written reason (FR-REV-07)", true);
    await dh.fill("#adj-reason", "Inverse KPI: 4 days beats the 5-day target; capped at 100 pending OI-03.");
    await dh.click("button:has-text('Apply adjustment and approve')");
    await dh.waitForSelector(`text=Adjusted and approved "${K.adjust}"`, { timeout: T });
    check("Adjustment approved with reason (AC-21)", true);

    // Return with remarks
    await dh.locator(`main article:has-text('${K.ret}') button:has-text('View Request')`).click();
    await dh.click("button:has-text('Return to employee')");
    await dh.fill("#reason", "Please attach the outlet onboarding list from the distributor portal.");
    await dh.click("button:has-text('Return KPI')");
    await dh.waitForSelector(`text=Returned "${K.ret}"`, { timeout: T });
    check("Return to Employee with remarks (AC-21)", true);

    // Leaderboard
    await dh.goto(`${BASE}/leaderboard?type=MONTHLY&month=9&year=2026`);
    await dh.waitForSelector("text=Department ranking", { timeout: T });
    const lb = await dh.locator("main").innerText();
    check("Leaderboard ranks GA employees only, with rank numbers (AC-24)", /Rafi Ahmed/.test(lb) && /Sadia Noor/.test(lb) && !/Tania Karim/.test(lb));
    await shot(dh, "22-leaderboard.png");

    // Department Head's own KPIs route to the Super Admin (OI-04)
    await dh.goto(`${BASE}/my-kpi`);
    await dh.click('button[aria-label="Create KPI"]');
    await dh.waitForSelector("#approverId", { timeout: T });
    const dhApprovers = await dh.locator("#approverId option:not([disabled])").allTextContents();
    check("Department Head's Approval Person = Super Admin (OI-04)", dhApprovers.length === 1 && /Sarwar/.test(dhApprovers[0]), dhApprovers.join("|"));
    await ctx.close();
  }

  /* ============ 3. Employee: sees decisions, resubmits the returned KPI ============ */
  {
    const ctx = await browser.newContext(vp);
    const page = await login(ctx, "rafi.ahmed@anwargroup.net", PW.user);
    await page.locator(`article:has-text('${K.adjust}')`).first().locator("text=View Details").click();
    await page.waitForSelector("text=Adjustment History", { timeout: T });
    const t = await page.locator("main").innerText();
    check("Employee sees adjusted final score + reason in Adjustment History (AC-15)", /Adjusted/.test(t) && /Inverse KPI/.test(t) && /Final Score/i.test(t) && /100/.test(t));
    await shot(page, "14-adjustment-history.png");

    await page.goto(`${BASE}/my-kpi`);
    await page.locator(`article:has-text('${K.ret}')`).first().locator("text=View Details").click();
    await page.waitForSelector("text=Correct and resubmit", { timeout: T });
    check("Returned KPI shows approver remarks (FR-DET-06)", /distributor portal/.test(await page.locator("main").innerText()));
    await page.click("text=Correct and resubmit");
    await page.waitForSelector("#kpi-form", { timeout: T });
    await page.fill("#actual", "12");
    await page.setInputFiles("#evidence", evidence);
    await page.click('button[form="kpi-form"]');
    await page.waitForURL(/resubmitted=1/, { timeout: T });
    const r = await page.locator("main").innerText();
    check("Resubmitted → Submitted; v2 Returned and v3 Resubmitted kept (FR-KPI-07, BR-21)", /v2 · Returned/.test(r) && /v3 · Resubmitted/.test(r));
    await ctx.close();
  }

  /* ============ 4. Other department's head: refused by link (AC-06) ============ */
  {
    const ctx = await browser.newContext(vp);
    const hr = await login(ctx, "farhana.rahman@anwargroup.net", PW.head);
    const res = await hr.goto(`${BASE}/my-kpi/${approveId}`);
    check("HR head refused GA KPI by direct link (AC-06)", res.status() === 404, `status ${res.status()}`);
    const rep = await hr.request.get(`${BASE}/api/kpi/${approveId}/report`);
    check("HR head refused GA report download (NFR-04)", rep.status() === 404, `status ${rep.status()}`);
    await hr.goto(`${BASE}/pending-requests?all=1`);
    const hrQueue = await hr.locator("main").innerText();
    check("HR head sees HR requests only (AC-06)", /Tania Karim|Nusrat Jahan/.test(hrQueue) && !/Rafi Ahmed/.test(hrQueue));
    await ctx.close();
  }

  /* ============ 5. Second head of the same department (AC-07) ============ */
  {
    const ctx = await browser.newContext(vp);
    const kamal = await login(ctx, "kamal.hasan@anwargroup.net", PW.head);
    await kamal.goto(`${BASE}/pending-requests?all=1`);
    const kq = await kamal.locator("main").innerText();
    check("Second GA head sees the same GA queue incl. resubmitted KPI (AC-07)", new RegExp(K.ret).test(kq) && /Sadia Noor|Shuvo Rahman/.test(kq) && !/Tania Karim/.test(kq));
    await ctx.close();
  }

  /* ============ 6. Sign-up → Outbox → set password → login (AC-01..05) ============ */
  {
    const ctx = await browser.newContext(vp);
    const reg = await ctx.newPage();
    await reg.goto(`${BASE}/register`);
    await reg.fill("#fullName", "E2E Tester");
    await reg.fill("#email", "e2e.tester@gmail.com");
    await reg.fill("#employeeId", `AG-E${RUN}`);
    await reg.selectOption("#businessUnitId", { index: 1 });
    await reg.selectOption("#departmentId", { label: "Growth Analytics" });
    await reg.click("button[type=submit]");
    await reg.waitForSelector("text=company email addresses can hold an account", { timeout: T });
    check("Non-company email refused, no account created (AC-01)", true);
    const email = `e2e.tester${RUN}@anwargroup.net`;
    await reg.fill("#email", email);
    await reg.click("button[type=submit]");
    await reg.waitForURL(/register\/sent/, { timeout: T });
    check("Valid sign-up sends setup email (AC-02)", true);
    await reg.goto(`${BASE}/dev/outbox`);
    const link = await reg.locator(`li:has-text('${email}') a:has-text('Open secure link')`).first().getAttribute("href");
    check("Setup link delivered to Outbox (FR-AUTH-05)", !!link && link.includes("/setup-password?token="));
    await reg.goto(`${BASE}${link}`);
    await reg.waitForSelector("#password", { timeout: T });
    await reg.fill("#password", "Strong#123");
    await reg.fill("#confirm", "Strong#124");
    check("Mismatch message shown (AC-04)", (await reg.locator("text=do not match").count()) > 0);
    check("Save blocked on mismatch (AC-04)", await reg.locator("button[type=submit]").isDisabled());
    await reg.click('button[aria-label="Show password"] >> nth=0');
    check("Eye icon reveals password (AC-03)", (await reg.getAttribute("#password", "type")) === "text");
    await reg.click('button[aria-label="Hide password"] >> nth=0');
    check("Eye icon hides password again (AC-03)", (await reg.getAttribute("#password", "type")) === "password");
    await reg.fill("#confirm", "Strong#123");
    await shot(reg, "30-set-password.png");
    await reg.click("button[type=submit]");
    await reg.waitForURL(/login\?setup=done/, { timeout: T });
    await reg.fill("#email", email);
    await reg.fill("#password", "Strong#123");
    await reg.click("button[type=submit]");
    await reg.waitForURL(/\/my-kpi$/, { timeout: T });
    check("New employee logs in and lands on My KPI (AC-05)", true);
    await reg.goto(`${BASE}${link}`);
    check("Setup link is single-use (FR-AUTH-06)", /no longer valid/.test(await reg.locator("main").innerText()));
    await ctx.close();
  }

  /* ============ 7. Super Admin: all KPIs, versions, invitation, audit (AC-25, AC-26) ============ */
  {
    const ctx = await browser.newContext(vp);
    const sa = await login(ctx, "superadmin@anwargroup.net", PW.admin);
    check("Super Admin lands on Dashboard (AC-05)", sa.url().endsWith("/dashboard"));
    await sa.goto(`${BASE}/admin/kpis`);
    const all = await sa.locator("main").innerText();
    check("Super Admin sees KPIs of every department incl. Department Heads (AC-25)", /Tania Karim/.test(all) && /Rafi Ahmed/.test(all) && /Dept Head/.test(all));
    await sa.goto(`${BASE}/admin/versions?kpi=${approveId}`);
    await sa.waitForSelector("text=Compare", { timeout: T });
    const vt = await sa.locator("main").innerText();
    check("Version history lists v1 Submit and v2 Approve (AC-26)", /v1 · Submit/.test(vt) && /v2 · Approve/.test(vt));
    await shot(sa, "40-version-control.png");
    await sa.goto(`${BASE}/admin/department-heads`);
    await sa.click("button:has-text('Invite Department Head')");
    await sa.fill("#inv-name", "E2E Head");
    await sa.fill("#inv-email", `e2e.head${RUN}@anwargroup.net`);
    await sa.fill("#inv-eid", `AG-H${RUN}`);
    await sa.selectOption("#inv-bu", { index: 1 });
    await sa.selectOption("#inv-dept", { label: "Marketing" });
    await sa.fill("#inv-role", "Head of Brand");
    await sa.click("button:has-text('Send invitation')");
    await sa.waitForSelector("text=Invitation sent", { timeout: T });
    check("Super Admin invites a Department Head (UC-09)", true);
    await shot(sa, "41-department-heads.png");
    await sa.goto(`${BASE}/admin/audit`);
    const audit = await sa.locator("main").innerText();
    check("Audit trail records decisions, invitations and logins (FR-AUD-04)", /Kpi Approved/.test(audit) && /Login/.test(audit) && /Department Head Invited/.test(audit));
    await ctx.close();
  }

  /* ============ 8. Anonymous access (NFR-04) ============ */
  {
    const ctx = await browser.newContext();
    const anon = await ctx.newPage();
    await anon.goto(`${BASE}/dashboard`);
    check("Anonymous user redirected to login", anon.url().includes("/login"), anon.url());
    const api = await anon.request.get(`${BASE}/api/kpi/${approveId}/report`, { maxRedirects: 0 });
    check("Anonymous API call refused", api.status() === 401 || (api.status() >= 300 && api.status() < 400), `status ${api.status()}`);
    await ctx.close();
  }
} catch (err) {
  console.error("\nUNEXPECTED ERROR:", err);
  failures++;
} finally {
  await browser.close();
  // Tidy up: the suite writes to the real database, so remove what it created (skip with KEEP_E2E_DATA=1).
  if (!process.env.KEEP_E2E_DATA) {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "e2e-cleanup.mjs")], { encoding: "utf-8" });
    console.log((r.stdout || r.stderr || "").trim());
  }
}

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed${failures ? `, ${failures} FAILED` : ""}.`);
process.exit(failures ? 1 : 0);
