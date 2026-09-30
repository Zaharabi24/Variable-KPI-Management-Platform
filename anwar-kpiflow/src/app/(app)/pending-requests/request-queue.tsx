"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Inbox } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { StatusBadge, Pill } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { ReviewDrawer } from "./review-drawer";
import { MONTHS_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type RequestItem = {
  id: string; name: string; category: string; status: string; target: number; actual: number; unit: string; weight: number;
  achievement: number; calculatedScore: number; finalScore: number | null; remarks: string; dataSource: string;
  periodYear: number; periodMonth: number; submittedAt: string; currentVersion: number;
  owner: { id: string; fullName: string; employeeId: string; designation: string | null; department: string | null };
  approver: { fullName: string };
  evidence: { id: string; fileName: string; sha256: string; size: number }[];
  versions: { id: string; versionNo: number; action: string; changes: string; reason: string | null; createdAt: string; changedBy: { fullName: string } }[];
  isResubmission: boolean;
};

/** FR-REV-01..04 / Section 15.7 — queue grid with search by Employee Name or Employee ID, employee filter, and the review drawer. */
export function RequestQueue({ items, openId, allPeriods, scopeLabel }: { items: RequestItem[]; openId: string | null; allPeriods: boolean; scopeLabel: string }) {
  const [q, setQ] = React.useState("");
  const [employee, setEmployee] = React.useState("");
  // The open request is held as a snapshot so the drawer stays mounted (and can show its
  // confirmation) even after a decision removes the item from the revalidated list.
  const [active, setActive] = React.useState<RequestItem | null>(() => items.find((i) => i.id === openId) ?? null);
  const [missingId, setMissingId] = React.useState<string | null>(openId && !items.some((i) => i.id === openId) ? openId : null);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  React.useEffect(() => {
    if (!openId) return;
    const found = items.find((i) => i.id === openId) ?? null;
    setActive(found);
    setMissingId(found ? null : openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const employees = Array.from(new Map(items.map((i) => [i.owner.id, i.owner])).values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const needle = q.trim().toLowerCase();
  const visible = items.filter(
    (i) =>
      (!employee || i.owner.id === employee) &&
      (!needle || i.owner.fullName.toLowerCase().includes(needle) || i.owner.employeeId.toLowerCase().includes(needle) || i.name.toLowerCase().includes(needle)),
  );
  const toggleAll = () => {
    const next = new URLSearchParams(sp.toString());
    if (allPeriods) next.delete("all");
    else next.set("all", "1");
    router.push(`${pathname}?${next.toString()}`);
  };

  const close = () => {
    setActive(null);
    setMissingId(null);
    if (sp.get("open")) {
      const next = new URLSearchParams(sp.toString());
      next.delete("open");
      router.replace(`${pathname}?${next.toString()}`);
    }
  };

  return (
    <>
      <Card>
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 pt-5 pb-4 border-b border-ink-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <Input aria-label="Search by Employee Name or Employee ID" placeholder="Search by Employee Name or Employee ID" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select aria-label="Employee" className="md:w-[220px]" value={employee} onChange={(e) => setEmployee(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName} · {e.employeeId}</option>)}
          </Select>
          <button onClick={toggleAll} className={cn("h-10 px-3.5 rounded-lg border text-[13px] font-medium transition-colors", allPeriods ? "bg-brand-700 border-brand-700 text-white" : "bg-white border-ink-200 text-ink-700 hover:bg-ink-100/60")}>
            {allPeriods ? "Showing all periods" : "Show all periods"}
          </button>
          <span className="md:ml-auto text-[12.5px] text-ink-400">{scopeLabel}</span>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={<Inbox className="h-5 w-5" />} title={items.length === 0 ? "No pending requests" : "No requests match"} description={items.length === 0 ? "Every submitted KPI in this period has been reviewed." : "Try another name, Employee ID or period."} />
        ) : (
          <div className="p-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 max-h-[calc(100vh-300px)] overflow-y-auto scroll-thin">
            {visible.map((r) => (
              <article key={r.id} className={cn("rounded-2xl border bg-white p-4 flex flex-col transition-shadow", active?.id === r.id ? "border-brand-400 shadow-pop" : "border-ink-100 hover:border-ink-200")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status="SUBMITTED" label="Pending your review" />
                  {r.isResubmission && <Pill tone="blue">Resubmitted · v{r.currentVersion}</Pill>}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-ink-900 leading-snug">{r.name}</h3>
                <div className="mt-1.5 text-[13px] text-ink-700">{r.owner.fullName}</div>
                <div className="text-[12px] text-ink-400">
                  <span className="font-mono">{r.owner.employeeId}</span> · {r.owner.designation ?? "Employee"}{r.owner.department ? ` · ${r.owner.department}` : ""}
                </div>
                <div className="mt-2 text-[12px] text-ink-400">{MONTHS_SHORT[r.periodMonth - 1]} {r.periodYear} · weight {r.weight}%</div>
                <button onClick={() => setActive(r)} className="mt-4 h-9 w-full rounded-lg bg-brand-800 text-white text-[13px] font-medium hover:bg-brand-900 transition-colors">
                  View Request
                </button>
              </article>
            ))}
          </div>
        )}
      </Card>

      {active && <ReviewDrawer key={active.id} item={active} onClose={close} />}
      {missingId && (
        <div className="mt-4 text-[13px] text-ink-500">
          This request is no longer pending. <Link href={`/my-kpi/${missingId}`} className="text-brand-700 hover:underline">Open the full record →</Link>
        </div>
      )}
    </>
  );
}
