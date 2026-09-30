/**
 * Visits every screen for each role at desktop and phone widths, recording HTTP status,
 * server error markers, browser console errors and horizontal overflow. Screenshots go to
 * ../docs/screenshots/walk/. Read-only: it never submits a form.
 *
 *   BASE_URL=http://localhost:3001 node scripts/route-walk.mjs
 */
import { chromium } from "playwright-core";
import * as fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve(process.cwd(), "..", "docs", "screenshots", "walk");
fs.mkdirSync(OUT, { recursive: true });

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const root = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  try {
    for (const d of fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse())
      for (const sub of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"]) {
        const p = path.join(root, d, sub);
        if (fs.existsSync(p)) return p;
      }
  } catch {}
  return undefined;
}

const ROLES = {
  employee: { email: "rafi.ahmed@anwargroup.net", pw: "User@2026", routes: ["/my-kpi", "/performance", "/performance?type=QUARTERLY", "/performance?type=YEARLY", "/profile"] },
  head: { email: "nasrin.islam@anwargroup.net", pw: "Head@2026", routes: ["/dashboard", "/dashboard?type=QUARTERLY", "/pending-requests", "/pending-requests?all=1", "/leaderboard", "/my-kpi", "/performance", "/profile"] },
  admin: { email: "superadmin@anwargroup.net", pw: "Admin@2026", routes: ["/dashboard", "/pending-requests?all=1", "/leaderboard", "/admin/department-heads", "/admin/employees", "/admin/employees?q=rafi", "/admin/kpis", "/admin/kpis?type=YEARLY", "/admin/versions", "/admin/organisation", "/admin/audit", "/profile", "/dev/outbox"] },
};
const PUBLIC = ["/login", "/register", "/forgot-password", "/setup-password?token=bad"];
const VIEWPORTS = [{ name: "desktop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }];

const browser = await chromium.launch({ headless: true, executablePath: findChrome() });
let problems = 0;

async function visit(page, url, label) {
  const errors = [];
  const handler = (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); };
  page.on("console", handler);
  const res = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(300);
  page.off("console", handler);
  const status = res?.status();
  const text = await page.locator("body").innerText();
  const serverErr = /Application error|Internal Server Error|Something went wrong loading/i.test(text);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const bad = (status && status >= 400) || serverErr || errors.length > 0 || overflow;
  if (bad) problems++;
  console.log(`${bad ? "WARN" : "ok  "} ${label.padEnd(34)} ${status}  ${overflow ? "H-OVERFLOW " : ""}${serverErr ? "SERVER-ERROR " : ""}${errors.length ? "console: " + errors.join(" || ") : ""}`);
  await page.screenshot({ path: path.join(OUT, `${label.replace(/[^a-z0-9]+/gi, "_")}.png`), fullPage: false });
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  for (const r of PUBLIC) await visit(page, r, `${vp.name} public ${r}`);
  await ctx.close();
  for (const [role, cfg] of Object.entries(ROLES)) {
    const c = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const p = await c.newPage();
    await p.goto(`${BASE}/login`);
    await p.fill("#email", cfg.email);
    await p.fill("#password", cfg.pw);
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), p.click("button[type=submit]")]);
    for (const r of cfg.routes) await visit(p, r, `${vp.name} ${role} ${r}`);
    if (vp.name === "phone") {
      await p.goto(`${BASE}${cfg.routes[0]}`);
      await p.click('button[aria-label="Open menu"]');
      await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(OUT, `phone_${role}_menu.png`) });
    }
    await c.close();
  }
}
await browser.close();
console.log(`\nRoute walk finished with ${problems} warning(s).`);
process.exit(problems ? 1 : 0);
