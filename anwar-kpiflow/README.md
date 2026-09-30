# Anwar KPIFlow — Variable KPI Phase 01 (Prototype 1)

Variable KPI & Performance Management System for Anwar Group of Industries, built strictly from
`BRD of KPI Management System.docx` (Version 1.0). Every score is traceable
**Target → Actual → Evidence → Score → Review → Approval**.

## Run it

```bash
cd anwar-kpiflow
cp .env.example .env # set DATABASE_URL / DATABASE_URL_UNPOOLED to a Postgres database
npm install          # also generates the Prisma client
npm run setup        # creates the schema and seeds demo data
npm run dev          # http://localhost:3000
```

Sign in with any account from [`../docs/DEMO_ACCOUNTS.md`](../docs/DEMO_ACCOUNTS.md) (also listed on the login page):

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@anwargroup.net | `Admin@2026` |
| Department Head (Growth Analytics) | nasrin.islam@anwargroup.net | `Head@2026` |
| Department Head (Human Resources) | farhana.rahman@anwargroup.net | `Head@2026` |
| Employee (Growth Analytics) | rafi.ahmed@anwargroup.net | `User@2026` |
| Employee (Human Resources) | tania.karim@anwargroup.net | `User@2026` |

Other scripts:

| Command | What it does |
|---|---|
| `npm run db:reset` | Wipe and reseed the demo database |
| `npm run build && npm start` | Production build and server |
| `node scripts/e2e-smoke.mjs` | Headless end-to-end test of the BRD acceptance criteria (needs a running server; `BASE_URL` overrides the port) |
| `node scripts/activate-employees.mjs` | Give every pending employee an active account without reseeding |

## What is implemented

**Accounts and access (BRD 6, 8.1, 9.1)**
- Employee self sign-up restricted to `@anwargroup.net`, uniqueness on email and Employee ID, secure single-use 48-hour setup link, password page with eye on/off toggles, strength policy and match check, login that lands on the role home (Employee → My KPI; Department Head and Super Admin → Dashboard).
- Super Admin invitation of Department Heads (several per department), invitation status and resend, forgot-password via the same secure link.
- Emails are delivered to an in-app **Outbox** (`/dev/outbox`) so the whole flow works offline; swap `src/lib/email.ts` for SMTP in production.
- Sessions are signed HTTP-only cookies; middleware plus per-page and per-API guards enforce role **and** department on the server. Failed logins are throttled and locked.

**Employee workspace (9.2–9.6)**
- Profile with editable Corporate Phone Number and designation; sign-up fields read-only.
- My KPI: parent card with the Create KPI (+) tile fixed on the right and a scrolling, aligned card grid; each card shows status badge, category and weight, Target/Actual/Score, the six-step tracker, time remaining and View Details.
- Create KPI side panel with the ten required fields plus KPI Category and KPI Period (OI-02), live Achievement and Score preview, drag-and-drop evidence upload with SHA-256 fingerprint, and Submit that enables only when valid.
- KPI detail: header with Download report, tracker, target/actual panel, evidence with hash and download, calculation path (Formula, Achievement, Calculated Score, Final Score, KPI Weight — no Curve Applied, Adjustment or Score Version rows), and full Adjustment History.
- Returned KPIs can be corrected and resubmitted; every version is kept.
- Performance Summary: Monthly/Quarterly/Yearly switch with month and year pickers, the five metrics (Total KPI Score, Average Achievement, Previous KPI Score, Difference with words, Approved x/y), the ten-column KPI Performance Records table, and three distinct-colour bar charts. Empty periods show a message, never blanks.

**Department Head workspace (9.7–9.9)**
- KPI Pending Request queue scoped to the department, oldest first, with count, period filter, employee filter and search by Employee Name or Employee ID.
- Review drawer with target/actual, evidence, remarks and calculation path; decisions Approve, Apply Adjustment (reason), Return to Employee (remarks), Reject (reason); record actions Edit/Update and Delete (reason). Every decision writes a version, a review decision and an audit entry.
- Department dashboard: Average Achievement with progress bar, Pending Evaluations, Total Approved, Rejected, and the KPIs-below-target list.
- Leaderboard ranked by Average Achievement with rank numbers and green/amber/red bands.
- Department Heads' own KPIs go to the Super Admin (OI-04).

**Super Admin (9.10–9.11)**
- Dashboard across all departments (with a department picker), the same queue and decisions for any department, Department Heads by department with invitation status, Employees with search/filters and add/edit/move/deactivate/remove, All KPIs and Approvals, Version Control and History with side-by-side comparison, Units and Departments lists, and the append-only Audit Trail.

**Calculation service (11)** — `src/lib/calc.ts` is the single implementation used by the form preview, detail view, summaries, dashboard and leaderboard: Achievement = Actual ÷ Target × 100, Score = Achievement (no curve), weighted Total KPI Score, previous-period comparison, calendar quarters (OI-05 default).

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS · Prisma + PostgreSQL (Neon) · jose sessions · bcrypt · Recharts · lucide-react.
The BRD leaves the stack open (OI-09). Evidence files are stored in the database with their SHA-256 hash so the app runs on hosts with ephemeral disks such as Vercel.

## Project layout

```
src/
  actions/     server actions: auth, kpi, review, admin (+ form helpers)
  app/         routes: (auth) login/register/setup-password, (app) role screens, api/ downloads, dev/outbox
  components/  ui kit (button, field, card, badge, tracker, modal, table, toast), shell (sidebar/topbar), kpi widgets
  lib/         db, auth guard, session, calc (Section 11), reporting, storage (evidence + hash), audit, email, versions
prisma/        schema (PostgreSQL) + seed (10 business units, 5 departments, 16 users, 46 KPIs across 2025–2026)
scripts/       e2e-smoke.mjs, activate-employees.mjs
```

## Open items honoured as working positions

OI-01 two Variable KPI categories · OI-02 category and period captured · OI-03 no cap (inverse KPIs flagged by approvers via Adjustment) · OI-04 heads approved by Super Admin · OI-05 calendar quarters · OI-06 Adjustment approves · OI-07 weights not forced to 100% · OI-10 numeric targets only · OI-11 bands 90/70 · OI-12 both Super Admin and heads decide · OI-13 self-registration plus Super Admin add/move · OI-14 in-app status only · OI-15 forgot-password reuses the setup link; evidence PDF/image/Excel/Word/CSV/text up to 10 MB.

## Deployment (Vercel)

The project is linked to Vercel project `variable-kpi-management-platform` with a Neon Postgres database from the Vercel Marketplace. `vercel-build` runs `prisma generate && prisma db push && next build`, so the schema is applied on every deploy. Seed the hosted database once from your machine with the Vercel env pulled locally:

```bash
vercel env pull .env.local --yes
npx dotenv -e .env.local -- npx tsx prisma/seed.ts   # or copy DATABASE_URL* into .env and run npm run db:seed
vercel --prod
```
