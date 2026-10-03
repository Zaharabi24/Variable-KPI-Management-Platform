import { Eye, Gauge, Paperclip, Stamp, Target, TrendingUp, Undo2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACKER_STEPS } from "@/lib/constants";

type StepState = "done" | "current" | "todo" | "returned" | "rejected";

/** One icon per step, in TRACKER_STEPS order: Target, Actual, Evidence, Score, Review, Approval. */
const STEP_ICONS: LucideIcon[] = [Target, TrendingUp, Paperclip, Gauge, Eye, Stamp];

/** Section 10.2 — status drives the six-step tracker. */
export function trackerStates(status: string, draft?: { target: boolean; actual: boolean; evidence: boolean }): StepState[] {
  if (status === "DRAFT") {
    const d = draft ?? { target: true, actual: false, evidence: false };
    return [d.target ? "done" : "todo", d.actual ? "done" : "todo", d.evidence ? "done" : "todo", d.actual ? "done" : "todo", "todo", "todo"];
  }
  const base: StepState[] = ["done", "done", "done", "done", "todo", "todo"];
  switch (status) {
    case "SUBMITTED":
      base[4] = "current";
      break;
    case "APPROVED":
    case "ADJUSTED":
      base[4] = "done";
      base[5] = "done";
      break;
    case "RETURNED":
      base[4] = "returned";
      break;
    case "REJECTED":
      base[4] = "rejected";
      break;
  }
  return base;
}

export function Tracker({ status, layout = "grid", className, draft }: { status: string; layout?: "grid" | "row"; className?: string; draft?: { target: boolean; actual: boolean; evidence: boolean } }) {
  const states = trackerStates(status, draft);
  const grid = layout === "grid";
  return (
    <ol
      // Grid (KPI cards): three content-sized columns spread across the card, so both rows stay aligned.
      // Cards are narrow, so connectors are left out and labels truncate instead of running into the next step.
      className={cn(grid ? "grid grid-cols-[auto_auto_auto] justify-between gap-x-1 gap-y-2.5" : "flex items-center justify-between", className)}
      aria-label="KPI progress"
    >
      {TRACKER_STEPS.map((label, i) => {
        const s = states[i];
        const last = i === TRACKER_STEPS.length - 1;
        const text = s === "returned" ? "Returned" : s === "rejected" ? "Rejected" : label;
        const stateText = s === "done" ? "completed" : s === "current" ? "in progress" : s === "todo" ? "not started" : s;
        return (
          <li key={label} className={cn("flex items-center min-w-0", !grid && !last && "flex-1")} aria-current={s === "current" ? "step" : undefined}>
            <StepIcon state={s} icon={STEP_ICONS[i]} compact={grid} />
            <span
              title={text}
              className={cn(
                "whitespace-nowrap",
                grid ? "ml-1.5 text-[11.5px] min-w-0 truncate" : "ml-2 text-[12.5px]",
                s === "done" && "text-ink-900 font-medium",
                s === "current" && "text-amber-800 font-semibold",
                s === "todo" && "text-ink-400",
                (s === "returned" || s === "rejected") && "text-red-700 font-semibold",
              )}
            >
              {text}
              <span className="sr-only"> ({stateText})</span>
            </span>
            {!grid && !last && <span className={cn("mx-2 h-px flex-1 min-w-[10px]", s === "done" ? "bg-ink-300" : "bg-ink-100")} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/** Neutral icon tile: filled when done, amber when awaiting action, dashed outline when not started. */
function StepIcon({ state, icon, compact }: { state: StepState; icon: LucideIcon; compact?: boolean }) {
  const Icon = state === "returned" ? Undo2 : state === "rejected" ? X : icon;
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 flex items-center justify-center",
        compact ? "h-6 w-6 rounded-md" : "h-7 w-7 rounded-lg",
        state === "done" && "bg-ink-100 text-ink-700",
        state === "current" && "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-300",
        state === "todo" && "border border-dashed border-ink-200 text-ink-300",
        (state === "returned" || state === "rejected") && "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200",
      )}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
    </span>
  );
}
