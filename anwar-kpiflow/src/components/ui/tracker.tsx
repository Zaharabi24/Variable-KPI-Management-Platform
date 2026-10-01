import { Check, X, Undo2 } from "lucide-react";
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
  return (
    <ol
      className={cn(layout === "grid" ? "grid grid-cols-3 gap-y-3" : "flex items-center justify-between", className)}
      aria-label="KPI progress"
    >
      {TRACKER_STEPS.map((label, i) => {
        const s = states[i];
        const last = i === TRACKER_STEPS.length - 1;
        const rowLast = layout === "grid" && (i + 1) % 3 === 0;
        return (
          <li key={label} className={cn("flex items-center min-w-0", layout === "row" && !last && "flex-1")}>
            <StepDot state={s} index={i + 1} />
            <span
              className={cn(
                "ml-2 text-[12.5px] whitespace-nowrap",
                s === "done" && "text-ink-700",
                s === "current" && "text-amber-800 font-semibold",
                s === "todo" && "text-ink-400",
                s === "returned" && "text-red-700 font-semibold",
                s === "rejected" && "text-red-700 font-semibold",
              )}
            >
              {s === "returned" ? "Returned" : s === "rejected" ? "Rejected" : label}
            </span>
            {!last && !rowLast && <span className="mx-2 h-px flex-1 min-w-[10px] bg-ink-200" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ state, index }: { state: StepState; index: number }) {
  const base = "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold";
  if (state === "done")
    return (
      <span className={cn(base, "bg-emerald-600 text-white")}>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
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
