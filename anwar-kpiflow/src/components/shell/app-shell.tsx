"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, UserCircle2, ChevronDown } from "lucide-react";
import { Sidebar } from "./sidebar";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { initials } from "@/lib/utils";

const TITLES: [string, string][] = [
  ["/dashboard", "Dashboard"],
  ["/pending-requests", "KPI Pending Request"],
  ["/variable-pay", "Variable Pay"],
  ["/leaderboard", "Leaderboard"],
  ["/my-kpi/", "KPI Details"],
  ["/my-kpi", "My KPI"],
  ["/performance", "Performance Summary"],
  ["/profile", "Profile"],
  ["/admin/department-heads", "Department Head"],
  ["/admin/employees", "Employees"],
  ["/admin/finance-admins", "Finance Admin"],
  ["/admin/kpis", "All KPIs"],
  ["/admin/versions", "Version Control and History"],
  ["/admin/organisation", "Units and Departments"],
  ["/admin/audit", "Audit Trail"],
  ["/dev/outbox", "Email Outbox"],
];

export function AppShell({
  user,
  pendingCount,
  vp,
  children,
}: {
  user: { fullName: string; email: string; role: Role; department: { name: string } | null; designation: string | null };
  pendingCount: number;
  vp?: { show: boolean; badge: number };
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const pathname = usePathname();
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Anwar KPIFlow";
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} pendingCount={pendingCount} vp={vp} open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-ink-900/[0.07] shadow-[0_1px_2px_rgba(24,24,27,0.03)] flex items-center px-4 sm:px-6 lg:px-8 gap-3">
          <button className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-ink-700 hover:bg-ink-100" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-[15px] font-semibold text-ink-900 truncate">{title}</h1>
          <div className="ml-auto relative" ref={menuRef}>
            <button
              onClick={() => setMenu((m) => !m)}
              className="flex items-center gap-2.5 rounded-full pl-1 pr-2.5 h-10 border border-transparent hover:bg-white hover:border-ink-200 hover:shadow-field transition-[background-color,border-color,box-shadow]"
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              <span className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-800 text-white text-[12px] font-semibold flex items-center justify-center ring-2 ring-white shadow-[0_1px_3px_rgba(136,30,29,0.35)]">{initials(user.fullName)}</span>
              <span className="hidden sm:block text-left leading-tight">
                <span className="block text-[13px] font-medium text-ink-900">{user.fullName}</span>
                <span className="block text-[11px] text-ink-500">{ROLE_LABELS[user.role]}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-ink-400" />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 mt-2 w-64 card p-1.5 shadow-pop animate-fade-up">
                <div className="px-3 py-2 border-b border-ink-100 mb-1">
                  <div className="text-[13px] font-medium text-ink-900 truncate">{user.fullName}</div>
                  <div className="text-[12px] text-ink-500 truncate">{user.email}</div>
                </div>
                <Link href="/profile" role="menuitem" onClick={() => setMenu(false)} className="flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13.5px] text-ink-700 hover:bg-ink-100">
                  <UserCircle2 className="h-4 w-4 text-ink-400" /> Profile
                </Link>
                <form action={logoutAction}>
                  <button type="submit" role="menuitem" className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13.5px] text-ink-700 hover:bg-ink-100">
                    <LogOut className="h-4 w-4 text-ink-400" /> Log out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
