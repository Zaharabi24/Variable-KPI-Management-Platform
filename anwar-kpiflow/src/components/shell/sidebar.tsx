"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Target, BarChart3, Inbox, Trophy, UserCircle2, Users, UserCog, UserCheck, ShieldCheck, ListChecks, History, Building2, Mail, ScrollText, Landmark, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { Logo } from "./logo";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number };

/** Sidebar navigation by role. `pendingCount` = KPI requests waiting for this person's decision. */
export function navFor(role: Role, pendingCount: number, mailUnread = 0): { section: string; items: Item[] }[] {
  // Every role has a Mailbox; the badge counts unread messages in the Inbox.
  const mailbox: Item = { href: "/mailbox", label: "Mailbox", icon: Mail, badge: mailUnread };
  const profile: Item = { href: "/profile", label: "Profile", icon: UserCircle2 };
  if (role === ROLES.EMPLOYEE) {
    return [
      {
        section: "Workspace",
        items: [profile, { href: "/my-kpi", label: "My KPI", icon: Target }, { href: "/performance", label: "Performance Summary", icon: BarChart3 }, mailbox],
      },
    ];
  }
  if (role === ROLES.DEPARTMENT_HEAD) {
    return [
      {
        section: "Department",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/kpi-requests", label: "KPI Pending Request", icon: Inbox, badge: pendingCount },
          { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
          mailbox,
        ],
      },
      {
        section: "My workspace",
        items: [{ href: "/my-kpi", label: "My KPI", icon: Target }, { href: "/performance", label: "Performance Summary", icon: BarChart3 }, profile],
      },
    ];
  }
  // HR Admin, Finance Admin and Audit Admin: their stage's dashboard and the KPI Request queue.
  if (role === ROLES.HR_ADMIN || role === ROLES.FINANCE_ADMIN || role === ROLES.AUDIT_ADMIN) {
    return [
      {
        section: role === ROLES.HR_ADMIN ? "Human Resources" : role === ROLES.FINANCE_ADMIN ? "Finance" : "Audit",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/kpi-requests", label: "KPI Request", icon: Inbox, badge: pendingCount },
          ...(role === ROLES.AUDIT_ADMIN ? [{ href: "/admin/audit", label: "Audit Trail", icon: ScrollText }] : []),
        ],
      },
      { section: "Account", items: [mailbox, profile] },
    ];
  }
  if (role === ROLES.SYSTEM_ADMIN) {
    return [
      {
        section: "Administration",
        items: [
          { href: "/admin/department-heads", label: "Department Head", icon: UserCog },
          { href: "/admin/employees", label: "Employees", icon: Users },
          { href: "/admin/kpis", label: "All KPIs", icon: ListChecks },
        ],
      },
      { section: "Account", items: [mailbox, profile] },
    ];
  }
  return [
    {
      section: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/kpi-requests", label: "KPI Requests", icon: Inbox, badge: pendingCount },
        { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
        mailbox,
      ],
    },
    {
      section: "Administration",
      items: [
        { href: "/admin/department-heads", label: "Department Head", icon: UserCog },
        { href: "/admin/hr-admins", label: "HR Admin", icon: UserCheck },
        { href: "/admin/finance-admins", label: "Finance Admin", icon: Landmark },
        { href: "/admin/audit-admins", label: "Audit Admin", icon: ShieldCheck },
        { href: "/admin/employees", label: "Employees", icon: Users },
        { href: "/admin/kpis", label: "All KPIs and Approvals", icon: ListChecks },
        { href: "/admin/versions", label: "Version Control and History", icon: History },
        { href: "/admin/organisation", label: "Units and Departments", icon: Building2 },
        { href: "/admin/audit", label: "Audit Trail", icon: ScrollText },
      ],
    },
    { section: "Account", items: [profile] },
  ];
}

export function Sidebar({
  user,
  pendingCount,
  mailUnread,
  open,
  onClose,
}: {
  user: { fullName: string; role: Role; department: { name: string } | null; designation: string | null };
  pendingCount: number;
  mailUnread?: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const groups = navFor(user.role, pendingCount, mailUnread);
  const scope = user.department ? user.department.name : user.role === ROLES.EMPLOYEE ? "" : "All departments";

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[264px] bg-white border-r border-ink-900/[0.07] flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-ink-100">
          <Logo />
          <button className="lg:hidden text-ink-500 hover:text-ink-900" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-brand-500 via-brand-600 to-brand-800" aria-hidden />

        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-6">
          {groups.map((g) => (
            <div key={g.section}>
              <div className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">{g.section}</div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = pathname === it.href || pathname.startsWith(it.href + "/");
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={onClose}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-[10px] px-3 h-10 text-[13.5px] transition-colors",
                          active ? "bg-gradient-to-r from-brand-50 to-brand-50/40 text-brand-700 font-semibold ring-1 ring-inset ring-brand-500/10" : "text-ink-700 hover:bg-ink-100/70 hover:text-ink-900",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-500" aria-hidden />}
                        <it.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-500" : "text-ink-400 group-hover:text-ink-700")} />
                        <span className="truncate">{it.label}</span>
                        {it.badge ? (
                          <span className="ml-auto min-w-[22px] h-5 px-1.5 rounded-full bg-gradient-to-b from-brand-500 to-brand-600 text-white text-[11px] font-bold flex items-center justify-center tnum shadow-[0_1px_2px_rgba(136,30,29,0.35)]">
                            {it.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-ink-100 bg-surface">
          <div className="text-[13px] font-medium text-ink-900 truncate">{user.fullName}</div>
          <div className="text-[12px] text-ink-500 truncate">
            {ROLE_LABELS[user.role]}
            {scope ? ` · ${scope}` : ""}
          </div>
        </div>
      </aside>
    </>
  );
}
