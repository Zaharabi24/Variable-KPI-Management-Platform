import { cn } from "@/lib/utils";
import { STATUS_LABELS, type KpiStatus } from "@/lib/kpi";

/** Section 15.11 — badges always carry the word, never colour alone. */
const styles: Record<KpiStatus, string> = {
  DRAFT: "ring-1 ring-inset ring-ink-300 text-ink-700 bg-ink-100/70",
  // Waiting for a first decision
  SUBMITTED: "ring-1 ring-inset ring-amber-400/70 text-amber-800 bg-amber-50",
  // Sent back one step: with the employee, the Department Head, HR or Finance
  RETURNED: "ring-1 ring-inset ring-red-400/70 text-red-700 bg-red-50",
  RETURNED_TO_HEAD: "ring-1 ring-inset ring-red-400/70 text-red-700 bg-red-50",
  RETURNED_TO_HR: "ring-1 ring-inset ring-red-400/70 text-red-700 bg-red-50",
  RETURNED_TO_FINANCE: "ring-1 ring-inset ring-red-400/70 text-red-700 bg-red-50",
  REJECTED: "bg-red-600 text-white ring-1 ring-inset ring-red-700/20 shadow-[0_1px_2px_rgba(185,28,28,0.3)]",
  // Moving forward through the chain
  DEPT_APPROVED: "ring-1 ring-inset ring-sky-400/70 text-sky-800 bg-sky-50",
  HR_APPROVED: "ring-1 ring-inset ring-sky-400/70 text-sky-800 bg-sky-50",
  FINANCE_APPROVED: "ring-1 ring-inset ring-emerald-600/60 text-emerald-800 bg-emerald-50",
  COMPLETED: "bg-emerald-700 text-white ring-1 ring-inset ring-emerald-800/20 shadow-[0_1px_2px_rgba(4,120,87,0.3)]",
};

export function StatusBadge({ status, className, label }: { status: string; className?: string; label?: string }) {
  const s = (status in styles ? status : "SUBMITTED") as KpiStatus;
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-semibold tracking-[0.01em] whitespace-nowrap before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:opacity-80", styles[s], className)}>
      {label ?? STATUS_LABELS[s]}
    </span>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" | "brand"; className?: string }) {
  const t = {
    neutral: "bg-ink-100 text-ink-700",
    green: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    blue: "bg-sky-50 text-sky-800 border border-sky-200",
    brand: "bg-brand-50 text-brand-700 border border-brand-100",
  }[tone];
  return <span className={cn("inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-medium whitespace-nowrap", t, className)}>{children}</span>;
}
