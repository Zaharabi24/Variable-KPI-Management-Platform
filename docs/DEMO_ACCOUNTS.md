# Anwar KPIFlow — Demo Accounts

Every account below is **active** and can sign in at `http://localhost:3000/login`.
The login page also lists them; clicking one fills the form.

Passwords by user type:

| User type | Password |
|---|---|
| Super Admin | `Admin@2026` |
| Department Head (Admin) | `Head@2026` |
| Employee (User) | `User@2026` |

## Super Admin (Upper Management)

| Name | Email | Employee ID | Scope |
|---|---|---|---|
| Sarwar Hossain | superadmin@anwargroup.net | AG-0001 | All departments, all Department Heads' KPIs, version control, invitations |

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

## Pending invitation (demonstrates FR-SA-08)

| Name | Email | Role | Department | How to activate |
|---|---|---|---|---|
| Rezaul Karim | rezaul.karim@anwargroup.net | Department Head | Finance & Accounts | Super Admin → Department Heads shows "Invitation pending". Open **Email Outbox**, click the secure link, set a password, then sign in. |

## Creating more accounts

- **Employees** self-register at `/register` with any `@anwargroup.net` address; the setup link appears in the Outbox (`/dev/outbox`).
- **Department Heads** are invited by the Super Admin (Department Heads → Invite Department Head).
- **Super Admin → Employees → Add employee** also creates an employee and sends the setup link.
- To restore the exact demo data: `npm run db:reset` inside `anwar-kpiflow/`.
