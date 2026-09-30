"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Target, BarChart3, Inbox, Trophy, UserCircle2, Users, UserCog, ListChecks, History, Building2, Mail, ScrollText, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { Logo } from "./logo";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number };

/** Section 8.2 — sidebar navigation by role. */
export function navFor(role: Role, pendingCount: number): { section: string; items: Item[] }[] {
  if (role === ROLES.EMPLOYEE) {
    return [
      {
        section: "Workspace",
        items: [
          { href: "/profile", label: "Profile", icon: UserCircle2 },
          { href: "/my-kpi", label: "My KPI", icon: Target },
          { href: "/performance", label: "Performance Summary", icon: BarChart3 },
        ],
      },
    ];
  }
  if (role === ROLES.DEPARTMENT_HEAD) {
    return [
      {
        section: "Department",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/pending-requests", label: "KPI Pending Request", icon: Inbox, badge: pendingCount },
          { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
        ],
      },
      {
        section: "My workspace",
        items: [
          { href: "/my-kpi", label: "My KPI", icon: Target },
          { href: "/performance", label: "Performance Summary", icon: BarChart3 },
          { href: "/profile", label: "Profile", icon: UserCircle2 },
        ],
      },
    ];
  }
  return [
    {
      section: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/pending-requests", label: "KPI Pending Request", icon: Inbox, badge: pendingCount },
        { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      ],
    },
    {
      section: "Administration",
      items: [
        { href: "/admin/department-heads", label: "Department Head", icon: UserCog },
        { href: "/admin/employees", label: "Employees", icon: Users },
        { href: "/admin/kpis", label: "All KPIs and Approvals", icon: ListChecks },
        { href: "/admin/versions", label: "Version Control and History", icon: History },
        { href: "/admin/organisation", label: "Units and Departments", icon: Building2 },
        { href: "/admin/audit", label: "Audit Trail", icon: ScrollText },
        { href: "/dev/outbox", label: "Email Outbox", icon: Mail },
      ],
    },
    {
      section: "Account",
      items: [{ href: "/profile", label: "Profile", icon: UserCircle2 }],
    },
  ];
}

export function Sidebar({
  user,
  pendingCount,
  open,
  onClose,
}: {
  user: { fullName: string; role: Role; department: { name: string } | null; designation: string | null };
  pendingCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const groups = navFor(user.role, pendingCount);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[264px] bg-brand-950 text-white flex flex-col transition-transform lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
          <Logo variant="dark" />
          <button className="lg:hidden text-white/70 hover:text-white" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-6">
          {groups.map((g) => (
            <div key={g.section}>
              <div className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">{g.section}</div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = pathname === it.href || pathname.startsWith(it.href + "/");
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 h-10 text-[13.5px] transition-colors",
                          active ? "bg-white/12 text-white font-medium" : "text-white/70 hover:bg-white/8 hover:text-white",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <it.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-200" : "text-white/50 group-hover:text-white/80")} />
                        <span className="truncate">{it.label}</span>
                        {it.badge ? (
                          <span className="ml-auto min-w-[22px] h-5 px-1.5 rounded-full bg-amber-400 text-brand-950 text-[11px] font-bold flex items-center justify-center tnum">
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

        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-[13px] font-medium text-white truncate">{user.fullName}</div>
          <div className="text-[12px] text-white/55 truncate">
            {ROLE_LABELS[user.role]}
            {user.department ? ` · ${user.department.name}` : user.role === ROLES.SUPER_ADMIN ? " · All departments" : ""}
          </div>
        </div>
      </aside>
    </>
  );
}
