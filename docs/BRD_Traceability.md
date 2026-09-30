# BRD → Implementation Traceability (Prototype 1)

Source: `BRD of KPI Management System.docx` v1.0. Paths are relative to `anwar-kpiflow/src`.
Status: ✅ implemented and covered by `scripts/e2e-smoke.mjs` · ☑ implemented (manual check) · ◐ partial / working position.

## 9.1 Account creation, password setup and login

| Req | Status | Where |
|---|---|---|
| FR-AUTH-01 Sign-up form, five mandatory fields | ✅ | `app/(auth)/register/register-form.tsx`, `actions/auth.ts` `registerAction` |
| FR-AUTH-02 Business Unit and Department lists | ✅ | lists from `BusinessUnit`/`Department` tables, maintained at `/admin/organisation` |
| FR-AUTH-03 `@anwargroup.net` only, clear message | ✅ AC-01 | `actions/auth.ts` `companyEmail` schema |
| FR-AUTH-04 Uniqueness on email and Employee ID | ✅ | `registerAction` duplicate check; DB unique constraints |
| FR-AUTH-05 Setup email with secure link | ✅ AC-02 | `issueSetupLink` → `lib/email.ts` (Outbox at `/dev/outbox`) |
| FR-AUTH-06 Unique, single-use, time-limited link | ✅ | `AccountToken` (48 h, `usedAt`), expired/used page offers a new link |
| FR-AUTH-07 New + Confirm Password | ✅ | `app/(auth)/setup-password/setup-form.tsx` |
| FR-AUTH-08 Eye on / eye off per field | ✅ AC-03 | `components/ui/field.tsx` `PasswordInput` |
| FR-AUTH-09 Match check | ✅ AC-04 | client + server (`setupPasswordAction`) |
| FR-AUTH-10 Strength policy shown before typing | ✅ | `PASSWORD_POLICY`, live checklist |
| FR-AUTH-11 Login lands on role home | ✅ AC-05 | `loginAction`, `lib/auth.ts` `homeFor` |

## 9.2 Profile

| Req | Status | Where |
|---|---|---|
| FR-PRO-01 Lists all sign-up values | ☑ | `app/(app)/profile` |
| FR-PRO-02 Corporate Phone Number editable | ☑ | `updateProfileAction` |
| FR-PRO-03 Email / ID / BU / Dept read-only for employee | ☑ | disabled fields; Super Admin edits at `/admin/employees` |

## 9.3–9.5 My KPI, cards, detail

| Req | Status | Where |
|---|---|---|
| FR-KPI-01 Create KPI (+) always on the right | ✅ AC-08 | `components/kpi/my-kpi-board.tsx` |
| FR-KPI-02 Ten required fields | ✅ | `components/kpi/kpi-form.tsx`; Achievement, Score, Status read-only |
| FR-KPI-03 Category + Period captured | ✅ | same form; `Kpi.category`, `periodYear/periodMonth` |
| FR-KPI-04 Submit disabled until valid, per-field messages | ✅ AC-09 | client validity + zod server validation |
| FR-KPI-05 Submit → Submitted, in department queue | ✅ | `createKpiAction` |
| FR-KPI-06 Locked while in review | ✅ | resubmit only when `RETURNED` |
| FR-KPI-07 Resubmission keeps previous version | ✅ | `resubmitKpiAction` → new `KpiVersion` |
| FR-KPI-08 Card layout incl. six-step tracker, time remaining | ✅ AC-12 | `components/kpi/kpi-card.tsx`, `ui/tracker.tsx` |
| FR-KPI-09/10/11 Container card, inner scroll, aligned grid | ✅ AC-13 | `my-kpi-board.tsx` (`auto-rows-fr`, inner scroll) |
| FR-DET-01..07 Detail header, tracker, panels, calc path, live changes, history | ✅ AC-14/15 | `components/kpi/kpi-detail.tsx`; report at `api/kpi/[id]/report` |

## 9.6 Performance Summary

| Req | Status | Where |
|---|---|---|
| FR-PS-01 Monthly/Quarterly/Yearly + month/year filters | ✅ | `components/kpi/period-filter.tsx`, `lib/reporting.ts` |
| FR-PS-02 Five metrics with direction words | ✅ AC-16 | `performanceSummary` |
| FR-PS-03 Exactly ten columns | ✅ AC-17 | `app/(app)/performance/page.tsx` |
| FR-PS-04 Evidence cell shows count, opens file | ✅ | link to `api/evidence/[id]` |
| FR-PS-05 Three bar charts, distinct colours | ✅ AC-18 | `components/kpi/charts.tsx` |
| FR-PS-06 No empty values | ✅ AC-19 | empty-state component |

## 9.7 KPI Pending Request

| Req | Status | Where |
|---|---|---|
| FR-REV-01 Queue, own department, oldest first, count | ✅ AC-20 | `app/(app)/pending-requests/page.tsx` (scoped Prisma query) |
| FR-REV-02 Card: status, KPI, Employee Name + ID, View Request | ✅ | `request-queue.tsx` |
| FR-REV-03 Filters by period and employee; search by name/ID | ✅ | same |
| FR-REV-04 Detail without leaving the queue; link to full record | ✅ | `review-drawer.tsx` |
| FR-REV-05 View Detail, Edit, Update, Delete | ✅ | `editKpiRequestAction`, `deleteKpiRequestAction` |
| FR-REV-06 Approve / Adjustment / Return / Reject | ✅ AC-21 | `actions/review.ts` |
| FR-REV-07 Reasons required (Delete: confirm + reason) | ✅ | dialogs + server checks |
| FR-REV-08 Leaves queue, employee sees new status, history written | ✅ | versions, decisions, audit |
| FR-REV-09 Super Admin same actions anywhere | ✅ AC-25 | `canDecideKpi` |

## 9.8–9.9 Dashboard and leaderboard

| Req | Status | Where |
|---|---|---|
| FR-DD-01..06 | ✅ AC-23 | `app/(app)/dashboard/page.tsx`, `departmentDashboard` |
| FR-LB-01..04 | ✅ AC-24 | `app/(app)/leaderboard/page.tsx`, `departmentLeaderboard` (ties share rank, alphabetical) |

## 9.10–9.11 Super Admin, versions, audit

| Req | Status | Where |
|---|---|---|
| FR-SA-01 Create/update/delete any record | ☑ | admin screens + decisions on any KPI; org lists |
| FR-SA-02..04 Invite heads, several per department, department-scoped | ✅ AC-07 | `inviteDepartmentHeadAction`, `/admin/department-heads` |
| FR-SA-05 Sees every head's KPIs | ✅ | `/admin/kpis` (owner role filter) |
| FR-SA-06 Add, move, deactivate, remove employees | ☑ | `/admin/employees` |
| FR-SA-07 Maintain BU and Department lists | ☑ | `/admin/organisation` |
| FR-SA-08 Invitation status and resend | ☑ | status pills, "Resend setup link" |
| FR-SA-09 / FR-AUD-01..03 Versioned records, compare | ✅ AC-26 | `/admin/versions`, `KpiVersion` |
| FR-AUD-04 Audit trail, not editable | ✅ | `lib/audit.ts` (append-only), `/admin/audit` |
| FR-AUD-05 Deletion traceable | ✅ | soft delete + `DELETE` version with reason |

## 10–12 Lifecycle, calculation, business rules

| Item | Status | Where |
|---|---|---|
| Five statuses, tracker states, event behaviour (10.x) | ✅ | `ui/tracker.tsx` `trackerStates`, `actions/review.ts` |
| Achievement, Score (no curve), weighted total, previous period, quarter mapping (11.x) | ✅ AC-10 | `lib/calc.ts` (single implementation, NFR-20) |
| BR-01..23 | ✅/☑ | enforced in `lib/auth.ts` guards, actions and schema; BR-10 (no self-approval) in `canDecideKpi` |

## 15 UI/UX

Card-based light layout, deep-green primary, tabular/monospace numbers, status badges with words (15.11), sidebar by role (8.2), drawers for Create KPI and review (15.4, 15.7), responsive sidebar (mobile drawer), keyboard-focus rings and ARIA labels, skeleton-free but instant server rendering, toasts after every submit and decision.

## 16–17 Non-functional and architecture

| Item | Status | Notes |
|---|---|---|
| NFR-04 server-side role + department enforcement | ✅ AC-06 | middleware + `requireRole` + `canViewKpi/canDecideKpi` + API routes |
| NFR-05 salted hashes | ✅ | bcrypt (cost 12) |
| NFR-07 evidence type/size checks, guarded download | ✅ | `lib/storage.ts`, `api/evidence/[id]` |
| NFR-08 throttled logins | ✅ | 5 failures → 15-minute lock |
| NFR-09 session expiry | ✅ | 12-hour signed cookie |
| NFR-11/13 reproducible scores, evidence hash | ✅ | stored target/actual/versions; SHA-256 |
| NFR-12 append-only audit/versions | ✅ | no update/delete paths |
| NFR-06 HTTPS / encryption at rest, NFR-17/18 backups | ◐ | deployment concerns, not in the prototype |
| 17.2 data model (9 entities) | ✅ | `prisma/schema.prisma` |
| 17.3 Bangladesh time | ✅ | display in `Asia/Dhaka` |

## Section 19 open items — working positions taken

See README "Open items honoured as working positions". Items needing business sign-off before build of the affected module remain: OI-03 (inverse KPIs / caps), OI-05 (quarter length, fiscal year), OI-11 (band thresholds), OI-15 (file limits).
