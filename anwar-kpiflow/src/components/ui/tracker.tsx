import { X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACKER_STEPS } from "@/lib/constants";

type StepState = "done" | "current" | "todo" | "returned" | "rejected";

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
        return (
          <li key={label} className={cn("flex items-center min-w-0", !grid && !last && "flex-1")}>
            <StepDot state={s} index={i + 1} compact={grid} />
            <span
              title={text}
              className={cn(
                "whitespace-nowrap",
                grid ? "ml-1.5 text-[11.5px] min-w-0 truncate" : "ml-2 text-[12.5px]",
                s === "done" && "text-ink-700",
                s === "current" && "text-amber-800 font-semibold",
                s === "todo" && "text-ink-400",
                s === "returned" && "text-red-700 font-semibold",
                s === "rejected" && "text-red-700 font-semibold",
              )}
            >
              {text}
            </span>
            {!grid && !last && <span className="mx-2 h-px flex-1 min-w-[10px] bg-ink-200" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ state, index, compact }: { state: StepState; index: number; compact?: boolean }) {
  const base = cn(
    "shrink-0 rounded-full flex items-center justify-center font-semibold tabular-nums",
    compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[12px]",
  );
  if (state === "done") return <span className={cn(base, "bg-emerald-600 text-white")}>{index}</span>;
  if (state === "current") return <span className={cn(base, "border-2 border-amber-500 text-amber-800 bg-amber-50")}>{index}</span>;
  if (state === "returned")
    return (
      <span className={cn(base, "border-2 border-red-400 text-red-700 bg-red-50")}>
        <Undo2 className="h-3.5 w-3.5" />
      </span>
    );
  if (state === "rejected")
    return (
      <span className={cn(base, "bg-red-600 text-white")}>
        <X className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  return <span className={cn(base, "border border-ink-200 text-ink-400 bg-white")}>{index}</span>;
}
