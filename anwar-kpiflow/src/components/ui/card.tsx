import * as React from "react";
import { cn } from "@/lib/utils";
import { LEADERBOARD_BANDS } from "@/lib/constants";

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
        <h2 className="text-[15.5px] font-semibold text-ink-900 leading-6">{title}</h2>
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
        <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.022em] text-ink-900">{title}</h1>
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
      {icon && <div className="mb-3 h-12 w-12 rounded-2xl bg-gradient-to-b from-brand-50 to-brand-100/70 text-brand-700 ring-1 ring-inset ring-brand-500/10 flex items-center justify-center">{icon}</div>}
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
    <div className="card card-lift relative overflow-hidden p-5 flex flex-col min-w-0 h-full">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-500/0 via-brand-500/60 to-brand-500/0" aria-hidden />
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-brand-500/[0.07] blur-2xl" aria-hidden />
      <div className="text-[11.5px] font-semibold text-ink-500 uppercase tracking-[0.07em]">{label}</div>
      <div className={cn("mt-2.5 text-[28px] font-semibold tnum leading-none tracking-[-0.02em]", toneCls)}>{value}</div>
      {hint && <div className="mt-2 text-[12.5px] text-ink-500">{hint}</div>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

const BAR_TONES = {
  positive: { fill: "bg-emerald-600", track: "bg-emerald-100", dot: "bg-emerald-600" },
  moderate: { fill: "bg-amber-500", track: "bg-amber-100", dot: "bg-amber-500" },
  negative: { fill: "bg-red-500", track: "bg-red-100", dot: "bg-red-500" },
} as const;

/** Performance band on the 100-point scale: Good >= high, Moderate >= middle, Low below (same thresholds as the leaderboard). */
export function performanceBand(pct: number): { tone: keyof typeof BAR_TONES; label: string } {
  if (pct >= LEADERBOARD_BANDS.high) return { tone: "positive", label: "Good" };
  if (pct >= LEADERBOARD_BANDS.middle) return { tone: "moderate", label: "Moderate" };
  return { tone: "negative", label: "Low" };
}

/**
 * Metric progress bar for stat tiles: slim track in a lighter step of the fill colour,
 * with a caption on the left and the percentage on the right.
 * tone "band" colours the bar by performance band (green / yellow / red) and names the band beside the percentage;
 * "positive" / "negative" force green / red (used for direction, e.g. Difference). No value shows a neutral empty track.
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
  tone?: "positive" | "negative" | "band";
  /** Overrides the right-hand label (defaults to the fill percentage). */
  percentLabel?: string;
}) {
  const empty = value === null || !(max > 0);
  const pct = empty ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const band = tone === "band" && !empty ? performanceBand(pct) : null;
  const colors = BAR_TONES[band ? band.tone : tone === "negative" ? "negative" : "positive"];
  const right = empty ? "—" : (percentLabel ?? `${Math.round(pct * 100) / 100}%`);
  return (
    <div>
      <div
        className={cn("h-1.5 w-full rounded-full overflow-hidden", empty ? "bg-ink-100" : colors.track)}
        role="progressbar"
        aria-label={caption}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={empty ? "No data" : `${right} · ${caption}${band ? ` · ${band.label} performance` : ""}`}
      >
        {/* A non-zero value always shows at least a sliver so it never reads as empty. */}
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", colors.fill)} style={{ width: `${pct}%`, minWidth: pct > 0 ? 6 : 0 }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] leading-4">
        <span className="text-ink-400 truncate">{caption}</span>
        <span className="tnum font-medium text-ink-700 shrink-0">
          {right}
          {band && <span className="font-normal text-ink-500"> · {band.label}</span>}
        </span>
      </div>
    </div>
  );
}

/** Legend for the performance bands used by MetricBar tone="band". */
export function BandLegend({ className }: { className?: string }) {
  const items = [
    { dot: BAR_TONES.positive.dot, text: `Good · ${LEADERBOARD_BANDS.high} and above` },
    { dot: BAR_TONES.moderate.dot, text: `Moderate · ${LEADERBOARD_BANDS.middle} to ${LEADERBOARD_BANDS.high - 0.01}` },
    { dot: BAR_TONES.negative.dot, text: `Low · below ${LEADERBOARD_BANDS.middle}` },
  ];
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-ink-500", className)} aria-label="Performance bands on a 100-point scale">
      {items.map((it) => (
        <li key={it.text} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", it.dot)} aria-hidden />
          {it.text}
        </li>
      ))}
    </ul>
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
