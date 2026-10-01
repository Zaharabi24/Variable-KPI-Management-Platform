import { cn } from "@/lib/utils";
import { STATUS_LABELS, type KpiStatus } from "@/lib/constants";

/** Section 15.11 — badges always carry the word, never colour alone. */
const styles: Record<KpiStatus, string> = {
  DRAFT: "border border-ink-300 text-ink-700 bg-ink-100/70",
  SUBMITTED: "border border-amber-400 text-amber-800 bg-amber-50",
  APPROVED: "bg-emerald-700 text-white border border-emerald-700",
  ADJUSTED: "border border-emerald-600 text-emerald-800 bg-emerald-50",
  RETURNED: "border border-red-400 text-red-700 bg-red-50",
  REJECTED: "bg-red-600 text-white border border-red-600",
};

export function StatusBadge({ status, className, label }: { status: string; className?: string; label?: string }) {
  const s = (status in styles ? status : "SUBMITTED") as KpiStatus;
  return (
    <span className={cn("inline-flex items-center h-6 px-2.5 rounded-full text-[11.5px] font-semibold tracking-wide whitespace-nowrap", styles[s], className)}>
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
