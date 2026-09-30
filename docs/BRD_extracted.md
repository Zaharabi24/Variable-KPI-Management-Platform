# Anwar KPIFlow — Variable KPI Phase 01
## Business Requirements Document (BRD)
Sep 30, 2026 · @Sarwar
Anwar KPIFlow replaces signature-based KPI approval with one platform where every variable KPI score is traceable from target to actual achievement, evidence, calculation, review and approval — for Employees, Department Heads and the Super Admin across all Anwar Group business units.
## 0. Document Control
This BRD is Version 1.0 (draft for business validation) of the requirements for Variable KPI Phase 01 of ANWAR KPI, branded in the product as Anwar KPIFlow. It is derived strictly from the source brief "Anwar KPI Management System" and its five reference screenshots.
- Product: ANWAR KPI — Anwar KPIFlow (Variable KPI & Performance Management System)
- Phase: Variable KPI Phase 01
- Organisation: Anwar Group of Industries
- Intended readers: business stakeholders, management, product team, UI/UX designers, software architects, developers and QA
- Source of truth: the source brief. Where this BRD adds a supporting rule that the brief implies but does not state (for example, password-link expiry), it is marked [Supporting]. Where the brief is unclear or self-contradictory, the point is listed in Section 19 for confirmation instead of being decided here.
How to read this document. Sections 1–4 explain why the system exists and what Phase 01 covers. Sections 5–8 explain who uses it and how work flows. Sections 9–14 are the detailed requirements developers and QA build and test against. Sections 15–18 cover the interface, quality and technical expectations. Requirement IDs (FR-, BR-, NFR-, UC-, US-, AC-) are used for traceability from this BRD into design, development and test cases.
## 1. Business Context
Anwar Group needs one Group KPI Management System, called ANWAR KPI, that works the same way for every business unit and department. Phase 01 builds its first part: variable KPI management.
### 1.1 The organisation
Anwar Group is a group of industries. The system must serve all ten business units:
- Anwar Cement Limited
- Anwar Cement Sheet Limited
- Anwar Ispat Limited
- Anwar Galvanizing Limited
- A-One Polymer Limited
- Anwar Textile
- Anwar Landmark
- Anwar Jute Spinning Mills Limited
- Anwar Technologies
- Anwar Organic
The Group also has many departments, such as Growth Analytics, Marketing and Human Resources. Every employee belongs to one business unit and one department, and that pairing decides who reviews and approves their KPIs.
### 1.2 Core approach
The programme follows three principles set by the business:
- Build a variable KPI management system — start with variable KPIs, which Phase 01 delivers.
- Define clear KPI ownership and accountability — every KPI has an owner (the employee) and a named approver (the department supervisor).
- Standardise KPI definitions and measurement — every KPI is recorded with the same fields and scored the same way, in every department.
### 1.3 Expected result
- One structured variable KPI journey.
- One scalable KPI ecosystem.
- One platform — ANWAR KPI.
- An extremely user-friendly platform.
### 1.4 One standard process for all departments
The interface and KPI process are identical for every department. The system is not built with separate screens or rules per department. What changes by department is only who can see and approve which KPIs: the Department Head of Growth Analytics sees and manages only Growth Analytics employees, the Department Head of HR only HR employees, and so on, however many departments exist.
## 2. Business Problem and Required Shift
Variable KPI performance is reviewed through a largely manual process today, so management often sees an approved score without the calculation or achievement behind it.
### 2.1 Current problems
- Invisible calculation. A final score may be approved, but management cannot always see how it was calculated or what actual achievement supports it.
- Scattered data. Targets, actual results and evidence are not captured in one place.
- Subjective scoring. Some scores become subjective or inconsistent across employees and departments.
- Number-only approvals. Approvals show a final number, not the calculation behind it.
- Limited reporting. Management reporting is limited because the underlying performance data is not structured.
- Untraceable adjustments. Manual score adjustments may have no clear audit trail or reason.
### 2.2 Required shift
The process must move from "KPI Name → Score → Signature → Approval" to "Target → Actual Achievement → Evidence Report → Score → Review → Approval".
[IMAGE #1]
Required shift · from 4 manual steps to 6 traceable steps
The new chain places the facts (target, actual, evidence) before the score, so the reviewer approves a calculation rather than a bare number.
### 2.3 The five questions every KPI must answer
For every KPI, Anwar KPIFlow must be able to answer, on screen and without offline records:
- What was the target?
- What was actually achieved?
- What evidence supports the result?
- How was the score calculated?
- Who reviewed and approved it?
## 3. Business Objectives
Phase 01 must deliver a simple system that makes employee variable KPI scoring objective, evidence-based, auditable and useful for management.
### 3.1 Objectives from the brief
- Understand and simplify the business process — replace the manual sign-off chain with one guided digital flow that is the same for every department.
- Objective KPI and scoring design — scores are calculated from recorded target and actual values, not typed in as opinions.
- Right experience for each user type — Employees, Department Heads (Admins) and Upper Management (Super Admin) each get the screens they need and nothing more.
- Reporting, auditability and control — every score, change and decision is recorded and reportable.
- Practical technical architecture and product judgment — a first version that is simple to build and run, and that can grow into the wider ANWAR KPI platform.
### 3.2 How success will be recognised
The objectives are met when, for any approved variable KPI in the system:
- the target, actual result, evidence file, calculation and approver can all be seen from one screen;
- any change made by an approver (score, KPI weight or other field) is visible to the employee, with its history;
- a Department Head can see the performance of their whole department on one dashboard, and the Super Admin can see every department;
- an employee can see their own performance by month, quarter and year without asking anyone for it.
Numeric adoption or time-saving targets are not set in the brief; management can add them after the first months of use provide a baseline.
## 4. System Scope
Phase 01 covers Variable KPIs only, in two categories — Project KPI and People & Culture KPI — for all business units and departments, with three user types: Super Admin, Admin (Department Head) and User (Employee).
### 4.1 In scope
- Accounts and access: employee self-registration restricted to @anwargroup.net emails, password setup by secure email link, login, and invitation of Department Heads by the Super Admin.
- Employee workspace: Profile, My KPI (create, submit, view detail) and Performance Summary.
- KPI record: the ten required KPI fields, evidence file upload, calculation path and adjustment history.
- Review and approval: KPI Pending Request queue for Department Heads with Approve, Reject, Adjustment and Return to Employee, plus View Detail, Edit, Update and Delete.
- Department Head workspace: their own My KPI and Performance Summary, a department dashboard and a department leaderboard with ranking.
- Super Admin workspace: full create, update and delete control, Department Head invitation (several per department allowed), visibility of all Department Heads' KPIs and all departments, and management of version control and version history.
- Reporting: monthly, quarterly and yearly performance summaries with KPI bar charts.
- Audit: a permanent record of submissions, reviewer decisions and every change to score or weight.
### 4.2 Out of scope for Phase 01
- Fixed KPIs — to be addressed in a future phase.
- Other ANWAR KPI modules beyond Variable KPI Phase 01.
- Automatic import of actual values from ERP or sales systems (one reference screenshot shows an ERP feed as a mock source; the brief does not require it, so actual values are entered by the employee in Phase 01).
- Separate interfaces or processes for individual departments — explicitly excluded by the brief.
### 4.3 Scope note to confirm
The brief's scope paragraph says both that "Project KPI will not be included" and that the Variable KPI scope "will specifically include Project KPI and People & Culture KPI". This BRD follows the specific statement — Project KPI and People & Culture KPI are the two Variable KPI categories in Phase 01 — and records the wording conflict as open item OI-01 in Section 19.
## 5. User Roles and Responsibilities
The system has exactly three user types. Access and approval are decided by role and assigned department; the screens and process are the same for every department.
[IMAGE #2]
User roles · 3 user types, department-scoped approval
HR and Growth Analytics are shown as examples; every department follows the same pattern, and one department may have several Department Heads.
### 5.1 Super Admin (Upper Management)
The Super Admin has full access to the entire system — all departments, employees, KPI information and system-level functions.
- Creates, updates and deletes any record in the system.
- Invites Department Heads (Approvers) by Full Name, Company Email, Employee ID, Business Unit, Role and Department; can add several Department Heads under one department.
- Sees every Department Head's KPIs and every employee's KPIs.
- Can receive, edit and approve employees' KPIs.
- Adds and manages employees within departments.
- Manages version control and version history of KPI records.
### 5.2 Admin (Department Head)
The Department Head is the approver for their own department's employees, and is also a KPI owner like any employee.
- Has the employee options My KPI and Performance Summary and submits their own KPIs through the same process as an employee.
- Works the KPI Pending Request queue: View Detail, Edit, Update and Delete requests; Approve, Reject, apply an Adjustment or Return to Employee.
- Filters requests by monthly, quarterly and yearly period, and finds them by Employee Name and Employee ID.
- Monitors the department through a dedicated dashboard and a department leaderboard.
- Sees KPIs of employees in their assigned department only.
### 5.3 User (Employee)
The employee owns and tracks their own KPIs.
- Registers with their company email and sets a password.
- Maintains their Profile, including an optional Corporate Phone Number.
- Creates KPIs with all required fields and evidence, and submits them to their department's supervisor.
- Follows each KPI's progress, sees any change the approver made and its adjustment history.
- Reviews their own performance by month, quarter and year.
- Sees only their own KPIs.
## 6. Access Control and Permission Logic
Every request is checked against two things: the user's role (Employee, Department Head or Super Admin) and the user's assigned department. The server enforces both; hiding a button in the interface is never the only control.
### 6.1 Permission matrix

| Capability | Employee | Department Head | Super Admin |
| Register own account (self sign-up) | Yes | By invitation | Not applicable |
| View and edit own Profile | Own | Own | All users |
| Create and submit KPIs (My KPI) | Own | Own | Not applicable |
| View KPI detail, calculation path and adjustment history | Own KPIs | Own KPIs and own department | All |
| View Performance Summary | Own | Own | All |
| View KPI Pending Requests | No | Own department | All |
| Approve, Reject, Adjust, Return to Employee | No | Own department | All |
| Edit, Update, Delete a pending request | No | Own department | All |
| Department dashboard and leaderboard | No | Own department | All departments |
| Invite Department Heads | No | No | Yes |
| Add and manage employees in departments | No | No | Yes |
| Version control and version history | No | No | Yes |
| Create, update, delete any record | No | No | Yes |

### 6.2 Data-visibility rules
- Employee: sees only KPIs they created. They cannot see any other employee's KPIs, scores or rankings outside what their own screens show.
- Department Head: sees their own KPIs plus the KPIs of employees assigned to the same department. A Department Head invited to the HR Department sees only HR employees, never Marketing or Growth Analytics.
- Several Department Heads in one department: each of them sees the same department queue and can act on it.
- Super Admin: sees all departments, all employees, all Department Heads' KPIs and all system settings.
### 6.3 Approver assignment logic
- The Approval Person for an employee's KPI must be a Department Head (supervisor) of the employee's own department. The Approval Person list offered to the employee is filtered to those people only.
- The Department Head's own KPIs follow the same submission process. [Supporting] Because a Department Head cannot approve their own KPI, their KPIs are routed to the Super Admin, who sees all Department Heads' KPIs. Confirmation is requested in OI-04.
- If an employee moves department, KPIs already submitted stay with the department that received them; new KPIs go to the new department's Department Head. [Supporting]
### 6.4 Session and account controls [Supporting]
- Only users with a completed password setup can log in.
- A deactivated or deleted user can no longer log in; their historical KPI records remain for audit.
- Every screen and API call requires an authenticated session; sessions expire after a period of inactivity set by the Super Admin policy.
## 7. End-to-End Workflow
A variable KPI moves through six stages — Target, Actual, Evidence, Score, Review, Approval — and only an approved KPI counts in performance reporting.
[IMAGE #3]
End-to-end KPI workflow · 3 lanes, 1 decision, 1 return loop
A returned KPI goes back to the employee for correction and re-enters the same queue on resubmission; a rejected KPI stops there.
### 7.1 Stage-by-stage description
- Create. The employee opens My KPI, selects Create KPI (+) and completes every required field: KPI, Target, Actual, KPI Weight, Evidence Report, Remarks and Approval Person. The system fills Achievement and Score from the values entered and shows the KPI Status.
- Submit. The employee submits the KPI to the chosen Approval Person, who must be a Department Head of the employee's department. The status becomes Submitted and the KPI card appears in the employee's My KPI list with its progress tracker.
- Queue. The request appears in the KPI Pending Request section of every Department Head of that department, showing Employee Name and Employee ID.
- Review. The Department Head opens View Detail to see target, actual, evidence file and the calculation path, and may edit or update the request.
- Decide. The Department Head chooses one action:
- Approve — the calculated score becomes the final score.
- Adjustment — the Department Head changes the Score, the KPI Weight or another field, gives a reason, and approves the adjusted values. The change is recorded in Adjustment History.
- Return to Employee — the KPI goes back to the employee with remarks for correction and resubmission.
- Reject — the KPI is closed as Rejected and is excluded from scoring.
- Report. Approved KPIs update the employee's Performance Summary and the department dashboard and leaderboard. Every decision, with who made it and when, is kept in the audit trail.
## 8. User Flows
There are two ways into the system — employee self sign-up and Super Admin invitation of a Department Head — and both finish at the same password setup and login.
### 8.1 Account creation, password setup and login
[IMAGE #4]
Account creation and login · 2 entry points, 2 checks
The domain check blocks any non-company email before an account exists; the password page cannot be completed until both fields match.
Employee path. The employee enters Full Name, Company Email Address, Employee ID, Business Unit and Department. The system rejects any email not ending in @anwargroup.net. It then emails a secure link; the employee sets New Password and Confirm Password (each with a working eye on/off icon), and logs in with company email and password.
Department Head path. The Super Admin enters Full Name, Company Email, Employee ID, Business Unit, Role and Department. The invitee receives an email to set their password and, once it is set, is assigned to that department and sees only its employees' KPIs.
### 8.2 Navigation by role
[IMAGE #5]
Sidebar navigation by role
My KPI and Performance Summary are the same screens for Employees and Department Heads. [Supporting] Department Heads also get a Profile page like employees, and the Super Admin items beyond Dashboard, Department Heads and version control are the screens needed to exercise the "create, update and delete anything" authority the brief gives.
### 8.3 Employee KPI flow (happy path)
- Log in → My KPI.
- Select Create KPI (+) on the card.
- Enter KPI, Target, Actual, KPI Weight, Remarks; attach the Evidence Report; select the Approval Person.
- Check the system-calculated Achievement and Score.
- Submit → the new KPI card appears in the list with status Submitted and its progress tracker.
- Open View Details at any time to follow review, see changes and read the Adjustment History.
- After approval, see the KPI in Performance Summary for the matching month, quarter and year.
### 8.4 Department Head review flow (happy path)
- Log in → Dashboard shows Pending Evaluations.
- Open KPI Pending Request; filter by month, quarter or year, or search by Employee Name or Employee ID.
- Open a request's detail: target, actual, evidence file, calculation path.
- Choose Approve, Adjustment (with reason), Return to Employee (with remarks) or Reject (with reason).
- The request leaves the pending queue; dashboard figures and the leaderboard update.
## 9. Functional Requirements
The requirements below are grouped by module in the order a user meets them. "Must" marks a mandatory Phase 01 behavior; [Supporting] marks a rule added only to make a stated requirement work.
### 9.1 Account creation, password setup and login
- FR-AUTH-01 — Sign-up form. The system must let an employee request an account by entering Full Name, Company Email Address, Employee ID, Business Unit and Department. All five fields are mandatory.
- FR-AUTH-02 — Business Unit and Department lists. Business Unit must be chosen from the ten Anwar Group business units; Department must be chosen from the departments maintained by the Super Admin.
- FR-AUTH-03 — Company domain only. The system must accept only email addresses ending in @anwargroup.net and must refuse to create an account for any other domain, with a clear message.
- FR-AUTH-04 — Uniqueness. [Supporting] One account per Company Email and per Employee ID; a duplicate is refused with a message that the account already exists.
- FR-AUTH-05 — Setup email. After a valid submission the system must send an account setup email to the entered company address containing a secure link to set the password.
- FR-AUTH-06 — Secure link. [Supporting] The link must be unique, single-use and time-limited; an expired or used link shows a message and a way to request a new one.
- FR-AUTH-07 — Password page. The page must show New Password and Confirm Password fields.
- FR-AUTH-08 — Eye On/Eye Off. Each password field must have an eye icon: one click reveals the typed password, the next click hides it again. The icon must always reflect the current state.
- FR-AUTH-09 — Match check. The system must not create the password until New Password and Confirm Password match, and must say so when they do not.
- FR-AUTH-10 — Password strength. [Supporting] Passwords must meet a minimum strength policy (length and character mix) shown on the page before the user types.
- FR-AUTH-11 — Login. A user with a created password logs in with company email and password and lands on their role's home screen (Employee: My KPI; Department Head and Super Admin: Dashboard).
### 9.2 Profile (Employee)
- FR-PRO-01 The Profile must list every value given at sign-up: Full Name, Company Email, Employee ID, Business Unit and Department.
- FR-PRO-02 The employee can add or edit a Corporate Phone Number in the Profile.
- FR-PRO-03 [Supporting] Company Email, Employee ID, Business Unit and Department are read-only for the employee; changes are made by the Super Admin so that department-based access cannot be self-altered.
### 9.3 My KPI — creating a KPI
- FR-KPI-01 — Create KPI (+). My KPI must always show a Create KPI (+) option, placed on the right of the KPI cards, whether or not KPIs already exist.
- FR-KPI-02 — Required fields. The Create KPI form must contain these ten fields, all required:
- KPI — the KPI name.
- Target — the planned value.
- Actual — the value actually achieved.
- Achievement — calculated by the system from Target and Actual and shown read-only (Section 11).
- KPI Weight — a percentage.
- Score — calculated by the system and shown read-only (Section 11).
- Evidence Report — an uploaded file supporting the actual result.
- Remarks — the employee's explanation.
- KPI Status — shown read-only and set by the system as the KPI moves through review (Section 10).
- Approval Person — selected from the Department Heads of the employee's own department.
- FR-KPI-03 — KPI category and period. [Supporting] Because Phase 01 covers two Variable KPI categories and reports by month, quarter and year, the form must also capture KPI Category (Project KPI or People & Culture KPI) and the KPI period the result belongs to. Confirmation is requested in OI-02.
- FR-KPI-04 — Validation. Submit stays disabled until every required field is valid: Target and Actual numeric, KPI Weight greater than 0 and at most 100, an evidence file attached, an Approval Person chosen. Each invalid field shows its own message.
- FR-KPI-05 — Submit. On submit the KPI is sent to the chosen Approval Person, its status becomes Submitted, and it appears in that department's KPI Pending Request queue.
- FR-KPI-06 — Locked while in review. [Supporting] A submitted KPI cannot be edited by the employee until it is Returned; this keeps the reviewed values the same as the submitted ones.
- FR-KPI-07 — Resubmission. A Returned KPI can be corrected by the employee and submitted again; the previous version is kept in history.
### 9.4 My KPI — the KPI card list
- FR-KPI-08 — Card layout. Each created KPI must appear as a card showing: KPI name; status badge; category and weight (for example "Weight 15%"); Target, Actual and Score; a six-step progress tracker — Target, Actual, Evidence, Score, Review, Approval — with completed steps ticked and the current step highlighted; time remaining in the KPI period; and a View Details button.
- FR-KPI-09 — Container card. The Create KPI option and the created KPI cards must sit inside one parent card.
- FR-KPI-10 — Scrolling. When KPIs exceed the visible area, the employee scrolls through them with a scroll bar inside the container, while the Create KPI (+) option stays visible.
- FR-KPI-11 — Alignment. Cards must be equal in size and aligned on a consistent grid at every supported screen width.
### 9.5 KPI detail view
- FR-DET-01 — Header. View Details must show the KPI name, owner name, category, weight, KPI period, status badge and a Download report action.
- FR-DET-02 — Tracker. The six-step tracker from the card is repeated across the top.
- FR-DET-03 — Target and actual panel. Shows Target, latest Actual, data source and the Reviewer / Approver name.
- FR-DET-04 — Evidence panel. Shows each evidence file name with a Download action and the file's integrity fingerprint (hash), as in the reference screen.
- FR-DET-05 — Calculation path. Shows Formula, Achievement, Calculated Score, Final Score (or its pending status) and KPI Weight. The rows Curve Applied, Adjustment and Score Version must not be shown.
- FR-DET-06 — Live changes. If the approver changes the Score, the KPI Weight or any other field, the detail view must show the changed value.
- FR-DET-07 — Adjustment History. The employee can open the full Adjustment History at any time: for each change, what changed, old value, new value, who changed it, when and the reason.
### 9.6 Performance Summary
- FR-PS-01 — Periods. The employee can view results for Monthly, Quarterly and Yearly periods, and filter by month and by year. Every figure on the page recalculates for the period chosen.
- FR-PS-02 — Summary metrics. For the selected period the page shows: Total KPI Score, Average Achievement, Previous KPI Score (same-length previous period), Difference from Previous Period with its direction in words (for example "3 below the previous month"), and Approved KPIs as approved / total (for example 6/7).
- FR-PS-03 — KPI Performance Records. A table lists the period's KPIs with exactly these columns: KPI, Target, Actual, Achievement, KPI Weight, Score, Evidence Report, Remarks, KPI Status, Approval Person. No other columns from the reference screen are added.
- FR-PS-04 — Evidence from the table. The Evidence Report cell shows the file count and opens or downloads the file.
- FR-PS-05 — KPI bar charts. The page shows a Monthly KPI bar chart, a Quarterly KPI bar chart and a Yearly KPI bar chart, each in a colour distinct from the other two.
- FR-PS-06 — No empty values. Metrics and rows are shown only where data exists; a period with no KPIs shows a clear "no KPIs for this period" message instead of blank or zero-filled cells.
### 9.7 KPI Pending Request (Department Head)
- FR-REV-01 — Queue. The Department Head sidebar must contain KPI Pending Request, listing every pending KPI request from employees of their own department, oldest first, with a count of requests waiting.
- FR-REV-02 — Request card. Each request shows status, KPI name, Employee Name and Employee ID, and a View Request action.
- FR-REV-03 — Filters and search. Requests can be filtered by Monthly, Quarterly and Yearly period and by employee, and searched by Employee Name or Employee ID.
- FR-REV-04 — Request detail. Opening a request shows Target, Actual, evidence files, the employee's remarks, the calculation path and the decision panel, without leaving the queue; a link opens the full record.
- FR-REV-05 — Record actions. The Department Head can View Detail, Edit, Update and Delete a pending request.
- FR-REV-06 — Decisions. The Department Head can Approve (calculated score becomes final), apply an Adjustment (change Score, KPI Weight or another field and approve the adjusted result), Return to Employee, or Reject.
- FR-REV-07 — Reasons. Adjustment, Return and Reject each require a written reason; Delete requires a confirmation and a reason. [Supporting] This answers the brief's problem that manual adjustments lack a reason.
- FR-REV-08 — Result. After any decision the request leaves the pending queue, the employee's KPI shows the new status and values, and the change is written to the history.
- FR-REV-09 — Super Admin authority. The Super Admin can receive, edit and approve any employee's KPI in any department with the same actions.
### 9.8 Department Head dashboard
- FR-DD-01 The Department Head must have a dedicated dashboard for their department, filterable by month, quarter and year.
- FR-DD-02 — Average Achievement. The average achievement of all department employees, shown with a progress bar.
- FR-DD-03 — Pending Evaluations. The number of KPI requests awaiting the Department Head's decision, linking to the queue.
- FR-DD-04 — Total Approved KPIs. The number of approved KPIs.
- FR-DD-05 — Rejected KPIs. The number of rejected KPIs.
- FR-DD-06 — KPIs below target. The KPIs whose Actual is below Target, with employee name, so the Department Head can follow up.
### 9.9 Department leaderboard
- FR-LB-01 The Department Head sidebar must include a department-wise Leaderboard.
- FR-LB-02 Each entry shows rank number, employee name, role or designation, achievement percentage and a horizontal progress bar, following the reference layout.
- FR-LB-03 Employees are ranked from highest to lowest achievement for the selected period; bars are coloured by performance band (high, middle, low) as in the reference.
- FR-LB-04 The leaderboard includes only employees of the Department Head's department; the Super Admin can view the leaderboard of any department.
### 9.10 Super Admin
- FR-SA-01 — Full control. The Super Admin can create, update and delete any record: users, departments, KPIs, decisions and settings.
- FR-SA-02 — Invite Department Heads. The Super Admin invites a Department Head (Approver) by Full Name, Company Email, Employee ID, Business Unit, Role and Department. The invitee receives an email to set their password and is then assigned to that department.
- FR-SA-03 — Several heads per department. More than one Department Head can be assigned to one department; each sees that department's employees and queue.
- FR-SA-04 — Department-scoped heads. A Department Head invited under a department is included only in that department and sees only its employees' KPIs.
- FR-SA-05 — Department Heads' KPIs. The Super Admin sees every Department Head's KPIs.
- FR-SA-06 — Employees in departments. The Super Admin adds employees to departments and can move, deactivate or remove them.
- FR-SA-07 — Organisation lists. [Supporting] The Super Admin maintains the Business Unit and Department lists used in sign-up and invitation.
- FR-SA-08 — Invitation status. [Supporting] The Super Admin sees whether each invitation is pending, accepted or expired, and can resend it.
- FR-SA-09 — Version control and history. The Super Admin can view and manage all versions of every KPI record (Section 9.11).
### 9.11 Version control, history and audit trail
- FR-AUD-01 — Versioned KPI records. Every change to a KPI after submission (resubmission, edit, adjustment, decision) creates a new version; earlier versions are never overwritten.
- FR-AUD-02 — Adjustment history. Each version records what changed, old and new values, who, when and why; this is what the employee sees as Adjustment History.
- FR-AUD-03 — Super Admin version view. The Super Admin can list, compare and inspect all versions of any KPI.
- FR-AUD-04 — Audit trail. Account creation, invitations, logins, submissions, decisions, edits, deletions and evidence uploads or downloads are recorded with user, time and action. Ordinary users cannot change the audit trail.
- FR-AUD-05 — Deletion is traceable. [Supporting] A deleted KPI or request is removed from normal screens but kept, with the reason, in version history for the Super Admin.
## 10. KPI Status Lifecycle and System Behavior
Every KPI carries one system-controlled status at a time; users change it only through the actions below, never by typing it.
↗ KPI status lifecycle · 5 statuses, 1 return loop
A Returned KPI can loop back to Submitted as many times as needed; Approved, Adjusted and Rejected are final for the employee.
### 10.1 Status definitions
- Submitted — sent to the Approval Person and waiting in the department's KPI Pending Request queue. The approver's queue may label it "Pending your review". The employee cannot edit it.
- Returned — sent back by the approver with remarks. The employee can correct and resubmit it.
- Approved — the approver accepted the calculated score, which becomes the final score.
- Adjusted (approved) — the approver changed the Score, KPI Weight or another value, gave a reason, and approved the adjusted result. The employee sees the change and its history.
- Rejected — the approver rejected the KPI with a reason. It does not count toward performance scores.
A KPI deleted by a Department Head or the Super Admin is removed from normal screens but kept in version history (FR-AUD-05).
### 10.2 How status drives the progress tracker
The six-step tracker on every KPI card and detail view follows the record:
- Target, Actual, Evidence, Score are ticked once the KPI is submitted with all required fields, because the system checks all four before allowing submission.
- Review is the current (highlighted) step while the KPI is Submitted, and returns to highlighted after a resubmission.
- Approval is ticked when the KPI is Approved or Adjusted. For a Returned or Rejected KPI the tracker shows that outcome at the Review step.
### 10.3 System behavior at each event
- On submit: calculate Achievement and Score, save version 1, set Submitted, add the request to the department queue and update the Department Head's Pending Evaluations count.
- On approve or adjust: fix the final score, save a new version, update the employee's Performance Summary, the department dashboard and the leaderboard.
- On return: save the approver's remarks, unlock the KPI for the employee, remove it from the pending queue until resubmitted.
- On reject: save the reason, close the KPI and add it to the dashboard's Rejected KPI count.
- On every event: write the audit entry (who, what, when, old and new values).
## 11. Calculation and Process Logic
Scores are calculated by the system from Target and Actual, with no curve, so any reviewer can re-derive a score from the numbers on screen. Only an approver's recorded adjustment can change a calculated value.
### 11.1 Achievement
Achievement uses the formula shown in the reference calculation path:
\text{Achievement (\%)} = \frac{\text{Actual}}{\text{Target}} \times 100
Achievement is shown to two decimal places. Target must be greater than zero.
### 11.2 Score
The brief removes "Curve Applied" from the calculation path, so no curve or cap is applied in Phase 01:
\text{Calculated Score} = \text{Achievement (\%)}
The Final Score equals the Calculated Score when the approver chooses Approve, or the adjusted score when the approver chooses Adjustment. Whether a cap or a different rule is needed for KPIs where a lower actual is better (for example turnaround days) is open item OI-03.
### 11.3 KPI Weight and the period total
Each KPI's weight sets its share of the period's total score:
\text{Weighted Score} = \text{Final Score} \times \frac{\text{KPI Weight (\%)}}{100}
\text{Total KPI Score} = \frac{\sum (\text{Final Score} \times \text{KPI Weight})}{\sum \text{KPI Weight}}
When an employee's KPI weights in a period add up to 100%, the Total KPI Score is simply the sum of the weighted scores. Only Approved and Adjusted KPIs are included.
Worked example (reference data). Upsell Revenue: Target 500,000 BDT, Actual 610,000 BDT. Achievement = 610,000 ÷ 500,000 × 100 = 122.00%. Calculated Score = 122. With a KPI Weight of 15%, its weighted score is 18.3.
### 11.4 Performance Summary metrics
- Total KPI Score — the weighted total above, for the selected month, quarter or year.
- Average Achievement — the simple average of Achievement % across the employee's Approved and Adjusted KPIs in the period.
- Previous KPI Score — the Total KPI Score of the immediately preceding period of the same type (previous month, quarter or year).
- Difference from Previous Period — Total KPI Score minus Previous KPI Score, shown as a number with words: "above" or "below the previous month / quarter / year". Example from the brief: 78 now and 75 before gives a difference of 3.
- Approved KPIs — Approved plus Adjusted KPIs, over all KPIs submitted for the period (for example 6/7).
### 11.5 Department Head dashboard and leaderboard metrics
- Average Achievement (department) — the average of each department employee's Average Achievement for the period, shown as a percentage with a progress bar.
- Pending Evaluations — the count of KPIs in Submitted status in the department.
- Total Approved KPI — the count of Approved and Adjusted KPIs.
- Rejected KPI — the count of Rejected KPIs.
- KPIs below target — KPIs whose Actual is below Target, meaning Achievement below 100%.
- Leaderboard rank — employees ordered by their Average Achievement for the period, highest first. [Supporting] Equal values share a rank and are listed alphabetically.
### 11.6 Period assignment
Each KPI belongs to the period captured on it (FR-KPI-03). Month, quarter and year views include every KPI whose period falls inside the selected range. The brief describes the quarterly view as a "6-month" period; the exact length and whether years are calendar or fiscal are open item OI-05.
## 12. Business Rules
These rules hold everywhere in the system, whatever screen or role triggers the action.
Accounts and roles
- BR-01 Only email addresses on the @anwargroup.net domain can hold an account.
- BR-02 There are exactly three user types: Super Admin, Admin (Department Head) and User (Employee).
- BR-03 Every Employee and Department Head belongs to one Business Unit and one Department.
- BR-04 Department Heads join only by Super Admin invitation; they are assigned to the department named in the invitation.
- BR-05 A department may have more than one Department Head.
Visibility and approval
- BR-06 An employee sees only their own KPIs.
- BR-07 A Department Head sees and manages only the KPIs of employees in their own department, plus their own KPIs.
- BR-08 The Super Admin sees all departments, employees and KPIs, including all Department Heads' KPIs.
- BR-09 The Approval Person for an employee's KPI must be a Department Head (supervisor) of that employee's department.
- BR-10 No one approves their own KPI. [Supporting]
- BR-11 The same interface and process apply to all departments; no department-specific screens or rules.
KPI content
- BR-12 Phase 01 handles Variable KPIs only, in the categories Project KPI and People & Culture KPI. Fixed KPIs are excluded.
- BR-13 All ten KPI fields are required before submission: KPI, Target, Actual, Achievement, KPI Weight, Score, Evidence Report, Remarks, KPI Status, Approval Person.
- BR-14 Achievement and Score are calculated by the system; employees cannot type them.
- BR-15 Every submitted KPI must carry at least one evidence file.
- BR-16 No curve, cap or score version is shown in the employee's calculation path; KPI Weight is shown.
Review and change control
- BR-17 The approver's decision is one of Approve, Adjustment, Return to Employee or Reject.
- BR-18 Any change by an approver to Score, KPI Weight or another field must carry a reason and is visible to the employee with its history.
- BR-19 Only Approved and Adjusted KPIs count toward Total KPI Score, averages, dashboard achievement and leaderboard rank.
- BR-20 A submitted KPI is read-only for the employee until it is Returned.
- BR-21 No version of a KPI is ever overwritten; each change creates a new version, managed by the Super Admin.
- BR-22 Deleting a KPI or request requires a reason and keeps the record in version history.
- BR-23 The audit trail cannot be edited by any user.
## 13. Use Cases
Ten use cases cover every Phase 01 interaction. Each names the actor, what must be true before it starts, the main path, the alternative paths and the result.
### UC-01 Register an employee account
- Actor: Employee. Precondition: has an @anwargroup.net mailbox.
- Main path: opens sign-up → enters Full Name, Company Email, Employee ID, Business Unit, Department → submits → system validates and sends the setup email.
- Alternatives: non-company domain → error, no account; email or Employee ID already registered → error, no duplicate.
- Result: a pending account awaiting password setup.
### UC-02 Set password and log in
- Actor: Employee or invited Department Head. Precondition: holds a valid setup link.
- Main path: opens link → enters New and Confirm Password, using the eye icon to check them → passwords match → password saved → logs in with company email and password → lands on role home.
- Alternatives: passwords differ → mismatch message, stays on page; link expired or used → message and request a new link.
- Result: active account; a Department Head is attached to their department.
### UC-03 Maintain profile
- Actor: Employee. Main path: opens Profile → sees sign-up details → adds or edits Corporate Phone Number → saves.
- Result: profile updated.
### UC-04 Create and submit a KPI
- Actor: Employee or Department Head (for their own KPI). Precondition: logged in; at least one approver exists for their department.
- Main path: My KPI → Create KPI (+) → enters KPI, Target, Actual, KPI Weight, Remarks, category and period → uploads evidence → sees Achievement and Score calculated → selects Approval Person → submits.
- Alternatives: a required field missing or invalid → Submit disabled with field messages; KPI was Returned → employee edits and resubmits (new version).
- Result: KPI in Submitted status, visible as a card and in the approver's queue.
### UC-05 Follow a KPI and its adjustment history
- Actor: Employee. Main path: My KPI → View Details → sees tracker, target and actual, evidence, calculation path → opens Adjustment History.
- Result: employee knows the status, final score and every change made by the approver.
### UC-06 Review performance summary
- Actor: Employee or Department Head (own results). Main path: Performance Summary → selects Monthly, Quarterly or Yearly and a month or year → sees the five summary metrics, KPI Performance Records and the three bar charts.
- Alternative: no KPIs in the period → a clear no-data message.
### UC-07 Review a pending KPI request
- Actor: Department Head (own department) or Super Admin. Precondition: a KPI is in Submitted status.
- Main path: KPI Pending Request → filters or searches by Employee Name or ID → opens request → checks target, actual, evidence and calculation → chooses Approve.
- Alternatives: Adjustment → changes Score, KPI Weight or another field, enters reason, confirms; Return to Employee → enters remarks; Reject → enters reason; Edit/Update → corrects the request with a recorded change; Delete → confirms with reason.
- Result: status updated, employee sees the outcome, history and audit written, dashboards refreshed.
### UC-08 Monitor the department
- Actor: Department Head. Main path: Dashboard → selects period → reads Average Achievement, Pending Evaluations, Approved, Rejected, KPIs below target → opens Leaderboard to see ranking.
- Result: Department Head knows where follow-up is needed.
### UC-09 Invite a Department Head
- Actor: Super Admin. Main path: Department Heads → Invite → enters Full Name, Company Email, Employee ID, Business Unit, Role, Department → sends.
- Alternatives: non-company email or duplicate → error; invitation expired → resend.
- Result: invitee receives the password email; after setup, they are Department Head of that department. Adding a second head to the same department follows the same path.
### UC-10 Manage versions and history
- Actor: Super Admin. Main path: Version Control and History → finds a KPI → views its versions and what changed between them, who changed it and why.
- Result: any score can be traced back to its original submission.
## 14. User Stories
The stories below express the requirements from each user's point of view; each maps to the functional requirement in brackets.
### 14.1 Employee
- US-01 As an employee, I want to create my account with my company email and employee details, so that I can use Anwar KPIFlow without IT help. (FR-AUTH-01 to 05)
- US-02 As an employee, I want to show and hide my password while typing it, so that I can set it correctly the first time. (FR-AUTH-08)
- US-03 As an employee, I want to add my corporate phone number to my profile, so that my record is complete. (FR-PRO-02)
- US-04 As an employee, I want to create a KPI with its target, actual, weight, evidence and remarks, so that my result is judged on facts. (FR-KPI-02)
- US-05 As an employee, I want the system to calculate my achievement and score, so that my score is objective and consistent with my colleagues'. (FR-KPI-02, Section 11)
- US-06 As an employee, I want to submit my KPI to my department supervisor, so that the right person reviews it. (FR-KPI-05)
- US-07 As an employee, I want to see all my KPIs as cards with a progress tracker, so that I know where each one stands. (FR-KPI-08)
- US-08 As an employee, I want to see any change the approver made to my score or weight and why, so that I understand my final score. (FR-DET-06, FR-DET-07)
- US-09 As an employee, I want to correct and resubmit a returned KPI, so that I do not have to start over. (FR-KPI-07)
- US-10 As an employee, I want to see my monthly, quarterly and yearly performance with charts and a comparison to the previous period, so that I can track my progress. (FR-PS-01 to 05)
### 14.2 Department Head
- US-11 As a Department Head, I want all pending KPI requests from my department in one queue, searchable by employee name and ID, so that I can review them quickly. (FR-REV-01 to 03)
- US-12 As a Department Head, I want to see the target, actual, evidence and calculation before deciding, so that my approval is evidence-based. (FR-REV-04)
- US-13 As a Department Head, I want to approve, adjust, return or reject a KPI with a reason, so that every decision is explained. (FR-REV-06, FR-REV-07)
- US-14 As a Department Head, I want a dashboard of my department's average achievement, pending, approved, rejected and below-target KPIs, so that I know where to act. (FR-DD-01 to 06)
- US-15 As a Department Head, I want a ranked leaderboard of my department, so that I can recognise top performers and support low performers. (FR-LB-01 to 04)
- US-16 As a Department Head, I want to submit my own KPIs the same way employees do, so that my performance is measured on the same basis. (Section 5.2)
### 14.3 Super Admin
- US-17 As the Super Admin, I want to invite Department Heads to a specific department, so that each department has its own approvers. (FR-SA-02 to 04)
- US-18 As the Super Admin, I want to see every Department Head's KPIs and every department's results, so that upper management has a full view. (FR-SA-05)
- US-19 As the Super Admin, I want to create, update and delete any record, so that I can correct the system when needed. (FR-SA-01)
- US-20 As the Super Admin, I want every KPI's versions and history, so that any final score can be audited. (FR-AUD-01 to 04)
## 15. UI/UX and Interface Requirements
The interface must feel like a premium, modern SaaS product: calm, card-based, perfectly aligned and simple enough that an employee can create and submit a KPI without training. The five reference screens from the brief set the visual direction; where the brief changes a reference, the change is stated beside it.
### 15.1 Design principles
- Extremely user-friendly. One primary action per screen (Create KPI, Submit, Approve), short labels, and no hidden steps.
- Card-based layout. Content sits in cards with consistent padding, radius and spacing, on a light neutral background, as in the references.
- Perfect alignment. The brief states that alignment of the My KPI interface must be perfect; the same standard applies to every screen — a consistent grid, equal card heights in a row and aligned numbers.
- Numbers are easy to scan. Target, Actual and Score use a monospaced or tabular-figure font and right alignment in tables, as in the references.
- Same screens for all departments. No department-specific layouts.
- Responsive. [Supporting] Works on desktop and laptop first, and remains usable on tablet and mobile browsers.
- Accessible. [Supporting] Text contrast, keyboard navigation and screen-reader labels to WCAG 2.1 AA; status is never shown by colour alone — the badge always carries the word.
### 15.2 Global layout
- A left sidebar with the role's menu (Section 8.2), the product name ANWAR KPI and the signed-in user's name, role and department.
- A top bar with the page title, period filter where relevant, and the user menu (Profile, Log out).
- A content area of cards; long lists scroll inside their card so headers and primary actions stay visible.
### 15.3 My KPI — KPI card
[IMAGE #6]
Each KPI card follows this reference: KPI name and status badge on the first line; category and weight on the second; Target, Actual and Score in three aligned columns; the six-step tracker in two rows of three; time remaining in the period; and a full-width-left View Details button. The Create KPI (+) tile sits to the right of the cards at all times, inside the same parent card, and the list scrolls vertically inside that card.
### 15.4 Create KPI form
- Opens as a side panel or modal over My KPI so the employee keeps context.
- Fields in reading order: KPI, KPI Category, KPI Period, Target, Actual, Achievement (read-only, updates as Target and Actual are typed), KPI Weight, Score (read-only), Evidence Report (drag-and-drop upload with file name and remove option), Remarks, KPI Status (read-only), Approval Person (dropdown of the department's Department Heads).
- Required-field markers, inline messages under each invalid field, and a Submit button that enables only when the form is valid.
### 15.5 KPI detail view
[IMAGE #7]
The detail view follows this reference with these changes required by the brief: the calculation path shows Formula, Achievement, Calculated Score, Final Score and KPI Weight, and must not show Curve Applied, Adjustment or Score Version. An Adjustment History panel is added below the calculation path, listing each change with field, old value, new value, changed by, date and reason.
### 15.6 Performance Summary
- A period switch (Monthly / Quarterly / Yearly) and month and year pickers at the top.
- Five metric tiles: Total KPI Score, Average Achievement, Previous KPI Score, Difference from Previous Period (with an up or down indicator and words), Approved KPIs (x/y).
- The KPI Performance Records table, styled like the reference below.
- Three KPI bar charts — Monthly, Quarterly and Yearly — each in its own distinct colour, with value labels on hover.
[IMAGE #8]
The table keeps this reference's styling (status badges, right-aligned numbers, evidence file button, horizontal scroll on narrow screens) but uses only the brief's ten columns: KPI, Target, Actual, Achievement, KPI Weight, Score, Evidence Report, Remarks, KPI Status, Approval Person. The reference's Reporting Date column is not added.
### 15.7 KPI Pending Request (Department Head)
[IMAGE #9]
The queue follows this reference: a header with the count of requests waiting (oldest first), filters for employee and period, and a grid of request cards with status, KPI name, employee and a View Request button. Changes required by the brief:
- Each card and the search must include Employee Name and Employee ID.
- The review drawer's calculation path follows Section 15.5 (no Curve Applied, Adjustment or Score Version rows).
- The decision area offers Approve, Apply Adjustment, Return to Employee and Reject, plus Edit, Update and Delete for the request. Adjustment, Return, Reject and Delete open a short form that requires a reason.
### 15.8 Department Head dashboard
- Top row of tiles: Average Achievement (with progress bar), Pending Evaluations, Total Approved KPI, Rejected KPI.
- A "KPIs below target" list showing employee name, Employee ID, KPI, target, actual and achievement, each linking to the KPI.
- Period filter (month, quarter, year) applying to every tile.
### 15.9 Department leaderboard
[IMAGE #10]
The leaderboard follows this reference and adds a rank number before each name. Bars use green for high, amber for middle and red for low performance, and the percentage is shown in the same colour.
### 15.10 Super Admin screens
- Department Heads: list by department with invitation status; an Invite form with Full Name, Company Email, Employee ID, Business Unit, Role and Department.
- Employees: searchable list by business unit and department with add, move, deactivate and delete actions.
- All KPIs and Approvals: every KPI across departments, including Department Heads' KPIs, with the same detail and decision screens.
- Version Control and History: per-KPI version list with a side-by-side comparison of changed fields.
### 15.11 Status badges, feedback and states
- Badges: Submitted (amber outline), Approved (solid green), Adjusted (green outline with "Adjusted" label), Returned (red outline), Rejected (solid red), matching the reference palette.
- Feedback: a short confirmation message after every submit and decision; a confirmation dialog before Delete.
- Loading and empty states: skeleton loaders while data loads; a friendly message and the relevant action (for example "Create your first KPI") when a list is empty — never blank cells or null values.
## 16. Non-Functional Requirements
These quality requirements support the brief's goals of an auditable, scalable and extremely user-friendly platform. Figures marked "target" are proposed values for the business to confirm (OI-08).
### 16.1 Usability
- NFR-01 A first-time employee can create and submit a KPI without training, guided only by the form's labels and messages.
- NFR-02 Every list, table and dashboard shows only values that exist; empty periods show a message, not blanks or nulls.
- NFR-03 The interface is fully usable on current Chrome, Edge, Safari and Firefox, and on screens from mobile width up to large desktop.
### 16.2 Security and privacy
- NFR-04 Role- and department-based access is enforced on the server for every page, API call and file download.
- NFR-05 Passwords are stored only as salted hashes using a modern algorithm; they are never emailed or displayed.
- NFR-06 All traffic uses HTTPS; evidence files and database backups are encrypted at rest.
- NFR-07 Evidence files are checked for type and size on upload and are downloadable only by users allowed to see that KPI.
- NFR-08 Repeated failed logins are throttled and temporarily locked.
- NFR-09 Sessions expire after inactivity; logging out ends the session everywhere it is used.
- NFR-10 Security follows the OWASP Top 10 guidance for web applications.
### 16.3 Auditability and data integrity
- NFR-11 Every score is reproducible from the stored Target, Actual, version and any recorded adjustment.
- NFR-12 Audit and version records are append-only and kept for at least the company's performance-record retention period.
- NFR-13 Each evidence file keeps a content fingerprint (hash) so any later change to the file can be detected.
### 16.4 Performance and scalability
- NFR-14 Target: pages and dashboards load within 3 seconds for a department of typical size.
- NFR-15 The design supports all ten business units and all their departments and employees on one platform without changes to code when departments or users are added.
- NFR-16 The data model can accept later KPI types (for example Fixed KPI) without restructuring Variable KPI records.
### 16.5 Availability and recovery
- NFR-17 Target: available during business hours with planned maintenance announced in advance.
- NFR-18 Automated daily backups of the database and evidence files, with a tested restore procedure.
### 16.6 Maintainability
- NFR-19 Business Units, Departments and Department Head assignments are managed through the Super Admin screens, not by developers.
- NFR-20 Calculation rules live in one server-side service, so the same formula is used by forms, detail views, summaries, dashboards and the leaderboard.
## 17. System and Architecture Considerations
A standard web architecture is enough for Phase 01: one responsive web application, one API that enforces role and department access, a relational database, file storage for evidence and an email service. The brief does not fix a technology stack; the choice is open item OI-09.
### 17.1 Logical architecture
↗ Logical architecture · 4 layers, 6 services
The access guard sits in front of every service, so department scoping cannot be bypassed by calling the API directly.
- Web application — a single-page, responsive front end rendering the role's sidebar, forms, cards, tables and charts.
- Access guard — checks the session, the user's role and their department on every request (Section 6).
- Accounts and invitations — sign-up with domain validation, secure setup links, Department Head invitations.
- KPI and evidence — KPI create, submit, resubmit; evidence upload with type and size checks and content hash.
- Review and decisions — the pending queue and the four decisions with reasons; Edit, Update and Delete.
- Calculation service — the single implementation of the Section 11 formulas, used by every screen.
- Reporting — Performance Summary, department dashboard and leaderboard figures by month, quarter and year.
- Versions and audit — append-only versions of each KPI and a system-wide audit log.
### 17.2 Core data model
↗ Core data model · 9 entities
The KPI record holds the current values; every change is stored as a new KPI Version, so history is never lost.
- Business Unit and Department are reference lists managed by the Super Admin.
- User holds identity, role, business unit, department and account status; a department can have several users with the Department Head role.
- Invitation records Super Admin invitations and their status until the invitee sets a password.
- KPI links an owner and an approver and holds category, period, target, actual, weight, achievement, score and status.
- Evidence File, KPI Version and Review Decision each belong to one KPI; Audit Log records every action across the system.
### 17.3 Technical considerations
- Server-side truth. Achievement and Score are calculated on the server when saving; values shown in the form are previews only.
- Department scoping in queries. Every query for KPIs, dashboards and leaderboards filters by the requesting user's department unless the user is the Super Admin.
- Evidence storage. Files are stored outside the database with a reference and hash; downloads go through the access guard.
- Email delivery. Setup and invitation emails are sent through a transactional email service with delivery logging, so failed sends can be retried.
- Time zone. All dates and periods are recorded and displayed in Bangladesh time (UTC+6). [Supporting]
- Extensibility. KPI type is stored on each record, so Fixed KPI and later ANWAR KPI modules can be added without reworking Variable KPI data.
## 18. Acceptance Criteria
Phase 01 is accepted when every criterion below passes in user acceptance testing with real users from at least two departments. Each criterion is written as a testable outcome.
### 18.1 Accounts and access
- AC-01 Given a sign-up with an email not ending in @anwargroup.net, when submitted, then no account is created and an error is shown.
- AC-02 Given a valid sign-up, when submitted, then a setup email with a working password link arrives at that address.
- AC-03 Given the password page, when the eye icon is clicked once, then the password is visible; when clicked again, then it is hidden — for both fields.
- AC-04 Given New and Confirm Password that differ, when saving, then the password is not created and a mismatch message is shown.
- AC-05 Given a created password, when the user logs in with company email and password, then they land on their role's home screen.
- AC-06 Given a Department Head invited to HR, when they log in, then they see HR employees' KPIs only, and an attempt to open another department's KPI by link is refused.
- AC-07 Given two Department Heads invited to the same department, when either logs in, then both see the same department queue.
### 18.2 My KPI
- AC-08 Given My KPI with or without existing KPIs, then the Create KPI (+) option is visible to the right of the cards inside the parent card.
- AC-09 Given the Create KPI form with any required field empty or no evidence file, then Submit is disabled and the missing field is indicated.
- AC-10 Given Target 500,000 and Actual 610,000, then Achievement shows 122.00% and Score shows 122 without manual entry.
- AC-11 Given the Approval Person list, then it contains only Department Heads of the employee's department.
- AC-12 Given a submitted KPI, then its card shows name, status Submitted, category, weight, target, actual, score, the six-step tracker with Review highlighted, time remaining and View Details.
- AC-13 Given more KPIs than fit on screen, then the list scrolls inside its card and cards stay aligned.
### 18.3 KPI detail and history
- AC-14 Given View Details, then the calculation path shows Formula, Achievement, Calculated Score, Final Score and KPI Weight, and does not show Curve Applied, Adjustment or Score Version.
- AC-15 Given an approver changes Score or KPI Weight, then the employee's detail view shows the new value and the Adjustment History lists the change with old value, new value, approver, time and reason.
### 18.4 Performance Summary
- AC-16 Given Monthly, Quarterly or Yearly selection, then Total KPI Score, Average Achievement, Previous KPI Score, Difference from Previous Period and Approved KPIs recalculate for that period and match Section 11.
- AC-17 Given the KPI Performance Records table, then it shows exactly the ten brief columns and no others.
- AC-18 Given the page, then the Monthly, Quarterly and Yearly bar charts are shown, each in a different colour.
- AC-19 Given a period with no KPIs, then a no-data message is shown and no blank or null values appear.
### 18.5 Review, dashboard and leaderboard
- AC-20 Given a submitted KPI, then it appears in the KPI Pending Request queue of its department's Department Heads with Employee Name and Employee ID, and can be found by searching either.
- AC-21 Given a request, when the Department Head chooses Approve, Adjustment, Return to Employee or Reject, then the status changes accordingly, a reason is required for all but Approve, and the employee sees the result.
- AC-22 Given Edit, Update or Delete on a request, then the change is saved as a new version and a deletion keeps the record in history.
- AC-23 Given the Department Head dashboard, then Average Achievement (with progress bar), Pending Evaluations, Total Approved KPI, Rejected KPI and KPIs below target match the department's records for the selected period.
- AC-24 Given the leaderboard, then department employees are ranked by average achievement with rank numbers and colour-banded bars, and no other department's employees appear.
### 18.6 Super Admin, versions and audit
- AC-25 Given the Super Admin, then they can view every department, every employee's KPIs and every Department Head's KPIs, and can create, update and delete any record.
- AC-26 Given any KPI, then the Super Admin can see its full version history, and no user can edit the audit trail.
- AC-27 Given the same KPI screens opened in two different departments, then layout and process are identical.
## 19. Assumptions, Open Items and Points to Confirm
Fifteen points in the brief are unclear, contradictory or unstated; this BRD takes a working position on each so development can start, and each needs business sign-off before build of the affected module.
### 19.1 Assumptions
- Every user has an active @anwargroup.net mailbox that can receive the setup email.
- Every department has at least one Department Head before its employees start submitting KPIs.
- Actual values are entered by the employee and evidenced by the uploaded file; no system integration supplies them in Phase 01.
- Amounts are recorded in the unit the employee enters (for example BDT, days, clients); the system does not convert units.
### 19.2 Open items

| ID | Point to confirm | Working position in this BRD |
| OI-01 | The brief says Project KPI is both excluded and included in Phase 01. | Phase 01 covers Variable KPIs in two categories: Project KPI and People & Culture KPI. Fixed KPI is excluded. |
| OI-02 | The ten KPI fields do not include category or period, yet scope and reporting need both. | KPI Category and KPI Period added as required fields (FR-KPI-03). |
| OI-03 | How to score KPIs where a lower actual is better (for example turnaround days), and whether scores are capped. | Achievement = Actual ÷ Target × 100 for all KPIs, no cap, until a rule is agreed. |
| OI-04 | Who approves a Department Head's own KPIs. | The Super Admin, who already sees all Department Heads' KPIs. |
| OI-05 | The brief calls the quarterly view "6-month"; also calendar or fiscal year. | Quarter length and year basis are configurable; defaults to be set by the business before go-live. |
| OI-06 | Whether "Adjustment" is a final decision or an edit before approval. | Adjustment approves the KPI with the adjusted values, as in the reference "Apply adjustment" button. |
| OI-07 | Whether an employee's KPI weights in a period must total 100%. | Not enforced; Total KPI Score uses the weighted average, which equals the weighted sum when weights total 100%. |
| OI-08 | Performance and availability targets. | 3-second page loads and business-hours availability proposed in Section 16. |
| OI-09 | Technology stack and hosting. | Not fixed; Section 17 is stack-neutral. |
| OI-10 | Targets that are not numbers (the reference shows a "Rubric" target). | Phase 01 accepts numeric Target and Actual only. |
| OI-11 | Leaderboard colour-band thresholds (high, middle, low). | Bands configurable by the Super Admin; defaults to be agreed. |
| OI-12 | The brief grants the Super Admin the right to receive, edit and approve employees' KPIs in the Department Head section. | Both the Super Admin (all departments) and the Department Head (own department) hold these rights. |
| OI-13 | Employees self-register, yet "department-wise employees are added by the Super Admin". | Employees self-register into a department; the Super Admin can also add, move and remove them. |
| OI-14 | Email alerts for submissions and decisions are not mentioned. | In-app status only; decision emails can be added if requested. |
| OI-15 | Forgot-password, allowed evidence file types and maximum file size. | Forgot-password reuses the secure setup link; file types and size limit to be agreed with IT. |
