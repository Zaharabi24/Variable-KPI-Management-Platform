# Anwar KPIFlow — Demo Accounts

Every account below is **active** and can sign in at `http://localhost:3000/login`.
The login page also lists them; clicking one fills the form.

Passwords by user type:

| User type | Password |
|---|---|
| Super Admin | `Admin@2026` |
| System Admin | `Admin@2026` |
| Finance Admin | `Finance@2026` |
| Department Head (Admin) | `Head@2026` |
| Employee (User) | `User@2026` |

## Super Admin (Upper Management)

| Name | Email | Employee ID | Scope |
|---|---|---|---|
| Sarwar Hossain | superadmin@anwargroup.net | AG-0001 | All departments, all Department Heads' KPIs, version control, invitations |

## System Admin

| Name | Email | Employee ID | Scope |
|---|---|---|---|
| Tanjila Hoque | sysadmin@anwargroup.net | AG-0002 | Invites Department Heads; adds, moves, deactivates and removes employees; can change any employee's fixed KPI target |

## Finance Admin

| Name | Email | Employee ID | Scope |
|---|---|---|---|
| Mahbub Alam | financeadmin@anwargroup.net | AG-0003 | Variable Pay payments only: sees every request the Super Admin approves and confirms the payment amount |

## Department Heads (Admin)

| Name | Email | Employee ID | Department | Note |
|---|---|---|---|---|
| Nasrin Islam | nasrin.islam@anwargroup.net | AG-0101 | Growth Analytics | Head |
| Kamal Hasan | kamal.hasan@anwargroup.net | AG-0102 | Growth Analytics | Second head of the same department (BR-05 / AC-07) |
| Farhana Rahman | farhana.rahman@anwargroup.net | AG-0201 | Human Resources | Head |
| Imran Chowdhury | imran.chowdhury@anwargroup.net | AG-0301 | Marketing | Head |

Department Heads submit their own KPIs through My KPI; those go to the Super Admin for approval (OI-04).

## Employees (User) — password `User@2026`

| Name | Email | Employee ID | Department | Designation |
|---|---|---|---|---|
| Rafi Ahmed | rafi.ahmed@anwargroup.net | AG-1042 | Growth Analytics | Sales Executive (reference employee: 16+ KPIs across 2025–2026) |
| Sadia Noor | sadia.noor@anwargroup.net | AG-1057 | Growth Analytics | Account Manager |
| Shuvo Rahman | shuvo.rahman@anwargroup.net | AG-1063 | Growth Analytics | Client Relations Officer |
| Mahin Chowdhury | mahin.chowdhury@anwargroup.net | AG-1078 | Growth Analytics | Sales Associate |
| Tania Karim | tania.karim@anwargroup.net | AG-2011 | Human Resources | HR Officer |
| Nusrat Jahan | nusrat.jahan@anwargroup.net | AG-2019 | Human Resources | Talent Acquisition Specialist |
| Arif Hossain | arif.hossain@anwargroup.net | AG-2024 | Human Resources | L&D Coordinator |
| Mehedi Hasan | mehedi.hasan@anwargroup.net | AG-3005 | Marketing | Brand Executive |
| Sumaiya Akter | sumaiya.akter@anwargroup.net | AG-3012 | Marketing | Digital Marketing Specialist |
| Jannatul Ferdous | jannatul.ferdous@anwargroup.net | AG-4001 | Supply Chain | Procurement Officer (no Department Head yet, so no approver is offered until one is invited) |
| Tanvir Alam | tanvir.alam@anwargroup.net | AG-5003 | Finance & Accounts | Accounts Executive (approver appears once Rezaul Karim accepts his invitation) |

### Additional employees — same password `User@2026`

These fill out the department rosters (for example the Variable Pay **Eligible employees** list and its Employee Name / Employee ID search). They have no KPIs of their own. On an existing database add them without reseeding: `npx tsx scripts/add-demo-employees.ts`.

| Name | Email | Employee ID | Department | Designation |
|---|---|---|---|---|
| Anika Tabassum | anika.tabassum@anwargroup.net | AG-1081 | Growth Analytics | Business Analyst |
| Fahim Shahriar | fahim.shahriar@anwargroup.net | AG-1084 | Growth Analytics | Data Analyst |
| Lamia Haque | lamia.haque@anwargroup.net | AG-1089 | Growth Analytics | Key Account Executive |
| Rakibul Islam | rakibul.islam@anwargroup.net | AG-1093 | Growth Analytics | Territory Sales Officer |
| Tasnim Jahan | tasnim.jahan@anwargroup.net | AG-1096 | Growth Analytics | Sales Coordinator |
| Sabbir Hossain | sabbir.hossain@anwargroup.net | AG-1102 | Growth Analytics | Senior Sales Executive |
| Nabila Sultana | nabila.sultana@anwargroup.net | AG-1107 | Growth Analytics | Market Research Officer |
| Ashraful Kabir | ashraful.kabir@anwargroup.net | AG-1115 | Growth Analytics | Regional Sales Manager |
| Rumana Akter | rumana.akter@anwargroup.net | AG-1121 | Growth Analytics | Customer Success Officer |
| Zubair Mahmud | zubair.mahmud@anwargroup.net | AG-1128 | Growth Analytics | Growth Executive |
| Shahana Parvin | shahana.parvin@anwargroup.net | AG-2031 | Human Resources | Compensation & Benefits Officer |
| Mizanur Rahman | mizanur.rahman@anwargroup.net | AG-2036 | Human Resources | HR Business Partner |
| Farzana Yasmin | farzana.yasmin@anwargroup.net | AG-2042 | Human Resources | Payroll Executive |
| Rasel Mia | rasel.mia@anwargroup.net | AG-2047 | Human Resources | Employee Relations Officer |
| Tahmid Rahman | tahmid.rahman@anwargroup.net | AG-3018 | Marketing | Trade Marketing Executive |
| Ishrat Jahan | ishrat.jahan@anwargroup.net | AG-3023 | Marketing | Content Specialist |
| Nafis Iqbal | nafis.iqbal@anwargroup.net | AG-3029 | Marketing | Graphic Designer |
| Sharmin Sultana | sharmin.sultana@anwargroup.net | AG-3034 | Marketing | Event & Activation Officer |

## Pending invitation (demonstrates FR-SA-08)

| Name | Email | Role | Department | How to activate |
|---|---|---|---|---|
| Rezaul Karim | rezaul.karim@anwargroup.net | Department Head | Finance & Accounts | Super Admin → Department Heads shows "Invitation pending". Open **Email Outbox**, click the secure link, set a password, then sign in. |

## Creating more accounts

- **Employees** self-register at `/register` with any `@anwargroup.net` address; the setup link appears in the Outbox (`/dev/outbox`).
- **Department Heads** are invited by the Super Admin (Department Heads → Invite Department Head).
- **Super Admin → Employees → Add employee** also creates an employee and sends the setup link.
- To restore the exact demo data: `npm run db:reset` inside `anwar-kpiflow/`.
