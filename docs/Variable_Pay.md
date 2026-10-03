# Variable Pay

Monthly Variable Pay evaluation of eligible employees by their Department Head, reviewed by HR.
Screen: **Variable Pay** in the Department Head sidebar (`/variable-pay`).

## Fields (taken from the organisation's sheet, unchanged)

**Individual** — SL, ID, Name, DOJ, Days, Tenure, Designation, Department, Supervisor, KPI (5), Quality of work,
Time Line of Deliverables, Stakeholder & Peer Review, Attendance, Total Score, Remarks, HR Note. Header: "Month of <Month>, <Year>".

**Score =** (maximum points)

| KPI (5) | Quality of work | Time Line of Deliverables | Stakeholder & Peer Review | Attendance | Total Score |
|---|---|---|---|---|---|
| 50 | 15 | 20 | 5 | 10 | 100 |

**KPI Score Break Down** — SL., 5 Major Tasks, Score (Out of 10 for Each), Remarks, Total.

## Calculations

- KPI (5) = sum of the five task scores (max 50).
- Total Score = KPI (5) + Quality of work + Time Line of Deliverables + Stakeholder & Peer Review + Attendance (max 100).
- Days = whole days from DOJ to today; Tenure = completed years and months. Both are frozen when the evaluation is submitted.

## Workflow

| Status | Meaning | Who can act |
|---|---|---|
| Not started | Eligible employee, no evaluation yet for the month | Department Head: Evaluate |
| Draft | Saved, incomplete allowed | Department Head: edit, Save as draft, Submit |
| Submitted | Locked and visible to HR | HR: add HR Note, Return for correction |
| Returned | Sent back by HR with a reason | Department Head: correct and resubmit |

## Roles

- **Department Head** — maintains the eligibility list for their own department (with DOJ and Supervisor), evaluates, saves drafts, submits.
- **HR** (the Human Resources Department Head, and the Super Admin) — sees submitted evaluations of every department, writes the HR Note, can return an evaluation.
- Employees and the System Admin have no access.

## Rules enforced on the server

- One evaluation per employee per month; future months cannot be evaluated.
- A Department Head can act only on employees of their own department who are on the eligibility list.
- Submit requires all five tasks (description and score 0–10) and all four other scores within their maximum.
- A submitted evaluation is locked; only HR can return it.
- Every eligibility change, draft, submission, HR note, return and export is written to the audit trail.

## Code

- `src/lib/variable-pay.ts` — criteria, maxima, totals, tenure (shared with the UI)
- `src/lib/variable-pay-service.ts` — rules and authorisation
- `src/lib/variable-pay-data.ts` — sheet queries
- `src/actions/variable-pay.ts` — server actions
- `src/app/(app)/variable-pay/` — page and screens
- `src/app/api/variable-pay/export/route.ts` — CSV export in the sheet's layout
- `scripts/variable-pay-check.ts` — rules check; runs in a transaction that is always rolled back
  (`npx tsx --env-file=.env scripts/variable-pay-check.ts`)

## Working positions to confirm with HR

- Eligibility is maintained by the Department Head. Move it to HR if HR should own the list.
- "HR" is the Human Resources Department Head plus the Super Admin.
- Employees do not see their own Variable Pay evaluation.
