import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink-900 leading-6">{title}</h2>
        {subtitle && <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="text-[13.5px] text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="mb-3 h-11 w-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
      {description && <p className="text-[13px] text-ink-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "good" | "bad" | "warn" | "up";
  children?: React.ReactNode;
}) {
  const toneCls = { default: "text-ink-900", good: "text-brand-700", bad: "text-red-600", warn: "text-amber-700", up: "text-emerald-700" }[tone];
  return (
    <div className="card p-5 flex flex-col min-w-0 h-full">
      <div className="text-[12px] font-medium text-ink-500 uppercase tracking-wide">{label}</div>
      <div className={cn("mt-2 text-[26px] font-semibold tnum leading-none", toneCls)}>{value}</div>
      {hint && <div className="mt-2 text-[12.5px] text-ink-500">{hint}</div>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

/**
 * Metric progress bar for stat tiles: slim track in a lighter step of the fill colour,
 * with a caption on the left and the percentage on the right.
 * Positive progress is always green; "negative" (a decline) is red; "empty" is a neutral track with no value.
 */
export function MetricBar({
  value,
  max = 100,
  caption,
  tone = "positive",
  percentLabel,
}: {
  value: number | null;
  max?: number;
  caption: string;
  tone?: "positive" | "negative";
  /** Overrides the right-hand label (defaults to the fill percentage). */
  percentLabel?: string;
}) {
  const empty = value === null || !(max > 0);
  const pct = empty ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const track = empty ? "bg-ink-100" : tone === "negative" ? "bg-red-100" : "bg-emerald-100";
  const fill = tone === "negative" ? "bg-red-500" : "bg-emerald-600";
  const right = empty ? "—" : (percentLabel ?? `${Math.round(pct * 10) / 10}%`);
  return (
    <div>
      <div
        className={cn("h-1.5 w-full rounded-full overflow-hidden", track)}
        role="progressbar"
        aria-label={caption}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={empty ? "No data" : `${right} · ${caption}`}
      >
        {/* A non-zero value always shows at least a sliver so it never reads as empty. */}
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fill)} style={{ width: `${pct}%`, minWidth: pct > 0 ? 6 : 0 }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] leading-4">
        <span className="text-ink-400 truncate">{caption}</span>
        <span className="tnum font-medium text-ink-700 shrink-0">{right}</span>
      </div>
    </div>
  );
}

export function ProgressBar({ value, tone = "brand", className }: { value: number; tone?: "brand" | "green" | "amber" | "red"; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = { brand: "bg-brand-600", green: "bg-emerald-600", amber: "bg-amber-500", red: "bg-red-500" }[tone];
  return (
    <div className={cn("h-2 w-full rounded-full bg-ink-100 overflow-hidden", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
