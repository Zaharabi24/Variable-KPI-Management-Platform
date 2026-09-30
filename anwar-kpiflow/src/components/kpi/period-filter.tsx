"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MONTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/field";
import type { PeriodRange } from "@/lib/calc";

/** Period switch + month/quarter/year pickers (Sections 15.6, 15.8). */
export function PeriodFilter({ period, compact = false }: { period: PeriodRange; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    router.push(`${pathname}?${next.toString()}`);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
      <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5" role="tablist" aria-label="Period type">
        {(["MONTHLY", "QUARTERLY", "YEARLY"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={period.type === t}
            onClick={() => set({ type: t })}
            className={cn(
              "h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors",
              period.type === t ? "bg-brand-700 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100",
            )}
          >
            {t === "MONTHLY" ? "Monthly" : t === "QUARTERLY" ? "Quarterly" : "Yearly"}
          </button>
        ))}
      </div>
      {period.type === "MONTHLY" && (
        <Select aria-label="Month" className="h-9 w-[132px]" value={String(period.index)} onChange={(e) => set({ month: e.target.value })}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </Select>
      )}
      {period.type === "QUARTERLY" && (
        <Select aria-label="Quarter" className="h-9 w-[150px]" value={String(period.index)} onChange={(e) => set({ quarter: e.target.value })}>
          {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q} · {MONTHS[(q - 1) * 3].slice(0, 3)}–{MONTHS[q * 3 - 1].slice(0, 3)}</option>)}
        </Select>
      )}
      <Select aria-label="Year" className="h-9 w-[92px]" value={String(period.year)} onChange={(e) => set({ year: e.target.value })}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </Select>
    </div>
  );
}
