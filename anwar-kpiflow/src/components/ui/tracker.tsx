import { Building2, Check, Eye, Gauge, Landmark, Send, ShieldCheck, Stamp, Undo2, UserCheck, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRACKER_STEPS } from "@/lib/constants";
import { KPI_STATUS, ROUTE_STEPS, STATUS_HINTS, routeStates, stageOf, type KpiStatus, type StepState } from "@/lib/kpi";

/** One icon per step, in TRACKER_STEPS order: Score, Review, Approval. */
const STEP_ICONS: LucideIcon[] = [Gauge, Eye, Stamp];

/**
 * KPI card progress in three steps:
 *   Score     the employee has scored the five tasks
 *   Review    Department Head and HR Admin
 *   Approval  Finance Admin and Audit Admin
 */
export function trackerStates(status: string, scored = true): StepState[] {
  if (status === KPI_STATUS.DRAFT) return [scored ? "done" : "current", "todo", "todo"];
  if (status === KPI_STATUS.RETURNED) return ["done", "returned", "todo"];
  if (status === KPI_STATUS.REJECTED) return ["done", "rejected", "todo"];
  if (status === KPI_STATUS.COMPLETED) return ["done", "done", "done"];
  const stage = stageOf(status);
  if (stage === "DEPT" || stage === "HR") return ["done", "current", "todo"];
  return ["done", "done", "current"];
}

export function Tracker({ status, layout = "grid", className, scored }: { status: string; layout?: "grid" | "row"; className?: string; scored?: boolean }) {
  const states = trackerStates(status, scored);
  const grid = layout === "grid";
  return (
    <ol className={cn(grid ? "grid grid-cols-3 gap-x-2" : "flex items-center justify-between", className)} aria-label="KPI progress">
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
                "whitespace-nowrap min-w-0 truncate",
                grid ? "ml-2 text-[12px]" : "ml-2 text-[12.5px]",
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
        compact ? "h-7 w-7 rounded-lg" : "h-7 w-7 rounded-lg",
        state === "done" && "bg-ink-100 text-ink-700",
        state === "current" && "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-300",
        state === "todo" && "border border-dashed border-ink-200 text-ink-300",
        (state === "returned" || state === "rejected") && "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

/* ---------- Status routing: Submit → Department Head Approval → HR Admin Approval → Finance Admin → Audit Admin ---------- */

const ROUTE_ICONS: LucideIcon[] = [Send, UserCheck, Building2, Landmark, ShieldCheck];

/** The live approval route. Every role sees the same five steps, with the current one highlighted. */
export function RouteTracker({ status, className }: { status: KpiStatus; className?: string }) {
  const states = routeStates(status);
  return (
    <div className={className}>
      <ol className="flex items-start" aria-label="Status routing">
        {ROUTE_STEPS.map((step, i) => {
          const s = states[i];
          const last = i === ROUTE_STEPS.length - 1;
          const Icon = s === "done" ? Check : s === "returned" ? Undo2 : s === "rejected" ? X : ROUTE_ICONS[i];
          const stateText = s === "done" ? "completed" : s === "current" ? "in progress" : s === "todo" ? "not started" : s;
          return (
            <li key={step.label} className={cn("relative flex flex-col items-center text-center min-w-0", last ? "flex-none w-[84px] sm:w-[120px]" : "flex-1")} aria-current={s === "current" || s === "returned" ? "step" : undefined}>
              {/* connector to the next step */}
              {!last && <span className={cn("absolute top-[17px] left-[calc(50%+22px)] right-[calc(-50%+22px)] h-[2px] rounded-full", s === "done" ? "bg-emerald-500" : "bg-ink-200")} aria-hidden />}
              <span
                aria-hidden
                className={cn(
                  "relative z-[1] h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                  s === "done" && "bg-emerald-600 text-white shadow-[0_1px_3px_rgba(5,150,105,0.4)]",
                  s === "current" && "bg-white text-amber-700 ring-2 ring-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,0.16)]",
                  s === "returned" && "bg-white text-red-600 ring-2 ring-red-400 shadow-[0_0_0_5px_rgba(248,113,113,0.14)]",
                  s === "rejected" && "bg-red-600 text-white",
                  s === "todo" && "bg-white text-ink-300 border border-dashed border-ink-300",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={s === "done" ? 3 : 2} />
              </span>
              <span
                className={cn(
                  "mt-2 px-1 text-[11.5px] leading-4",
                  s === "done" && "text-ink-900 font-medium",
                  s === "current" && "text-amber-800 font-semibold",
                  (s === "returned" || s === "rejected") && "text-red-700 font-semibold",
                  s === "todo" && "text-ink-400",
                )}
              >
                {step.label}
                <span className="sr-only"> ({stateText})</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-[12.5px] text-ink-500" aria-live="polite">{STATUS_HINTS[status]}</p>
    </div>
  );
}
