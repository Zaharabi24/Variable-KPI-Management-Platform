# Variable Pay

Monthly Variable Pay evaluation of eligible employees: prepared and submitted by the Department Head,
approved by the Super Admin, paid by the Finance Department. Screen: **Variable Pay** (`/variable-pay`).

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
- Days = whole days from DOJ to today; Tenure = completed years and months. Both are frozen when the request is submitted.

## Workflow

```
Draft ──submit──▶ Submitted ──approve──▶ Approved ──Finance confirms──▶ Payment confirmed
                     │  ▲
                     │  └── resubmit ── Returned (with feedback)
                     └──reject──▶ Rejected (final)
```

| Status | Meaning | Who acts next |
|---|---|---|
| Not started | Eligible employee, no request yet for the month | Department Head: Evaluate |
| Draft | Saved, may be incomplete, private to the Department Head | Department Head: Submit |
| Submitted | Locked; exact submission date and time recorded | Super Admin: Approve, Return or Reject |
| Returned | Sent back with the Super Admin's feedback | Department Head: correct and resubmit |
| Rejected | Closed for that month, with the Super Admin's reason | Nobody (final) |
| Approved | Visible to Finance | Finance: confirm the payment amount |
| Payment confirmed | Amount, reference, who and when recorded | Nobody (final) |

## Roles and views

| Role | View | Can do |
|---|---|---|
| Department Head | **My department** — one month at a time | Maintain the eligibility list (DOJ, Supervisor), evaluate, save drafts, submit, correct returned requests |
| Super Admin | **All requests** — every request of every month by default | Approve, return with feedback, reject with a reason, write the HR Note |
| Human Resources Department Head | **All requests** (read) | Write the HR Note only |
| Finance & Accounts members (head and employees) | **Finance** — approved requests and payment history | Confirm the payment amount, reference and note |
| Other employees, System Admin | No access | — |

The Super Admin and Finance lists can be filtered by **Department**, **Business Unit**, **Status** and **submission date** (from / to).
With no filter they show everything. Requests waiting for the viewer are listed first.

## Controls enforced on the server

- One request per employee per month; future months cannot be evaluated.
- A Department Head acts only on eligible employees of their own department.
- Submit requires all five tasks (description and score 0–10) and all four other scores within their maximum.
- Only the Super Admin decides, and only on a Submitted request; each request is decided once per submission.
- Return and Reject require a written comment, which the Department Head sees.
- Only Finance confirms payment, only on an Approved request, only once, with an amount greater than zero.
- Segregation of duties: nobody confirms payment on a request they evaluated, or on their own Variable Pay.
- Submitted, Approved, Rejected and Payment confirmed requests cannot be edited.

## Traceability

- **History** on every request (`VariablePayEvent`): who did what, when, with which comment. Append-only.
- **Audit trail** entry for every eligibility change, draft, submission, decision, HR note, payment and export.
- **Notifications** (in-app Outbox): Super Admins on submission; the Department Head on approve / return / reject;
  Finance on approval; the Department Head and Super Admins on payment.
- **Sidebar badge**: number of requests waiting for the signed-in user.
- **Export**: CSV in the sheet layout plus status, submission, decision and payment columns.

## Code

- `src/lib/variable-pay.ts` — criteria, statuses, access helpers, totals, tenure (shared with the UI)
- `src/lib/variable-pay-service.ts` — workflow rules and authorisation
- `src/lib/variable-pay-data.ts` — sheet, request list, filters, sidebar badge
- `src/actions/variable-pay.ts` — server actions, audit, notifications
- `src/app/(app)/variable-pay/` — page and screens
- `src/app/api/variable-pay/export/route.ts` — CSV export
- `scripts/variable-pay-check.ts` — workflow check; runs in a transaction that is always rolled back
  (`npx tsx --env-file=.env scripts/variable-pay-check.ts`)

## Working positions to confirm

- Eligibility is maintained by the Department Head. Move it to HR if HR should own the list.
- "Finance" means every active member of the Finance & Accounts department. Narrow it to the Finance Department Head if preferred.
- Finance enters the payment amount; the system does not calculate it from the score. Add a pay formula or slab table if one exists.
- A rejected request is final for that month.
- Employees do not see their own Variable Pay.
