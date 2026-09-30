import { cn } from "@/lib/utils";

export function Logo({ variant = "light", size = "md" }: { variant?: "light" | "dark"; size?: "md" | "lg" }) {
  const dark = variant === "dark";
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("rounded-lg flex items-center justify-center shrink-0", size === "lg" ? "h-10 w-10" : "h-8 w-8", dark ? "bg-brand-400/20" : "bg-brand-700")}>
        <svg viewBox="0 0 24 24" className={cn(size === "lg" ? "h-6 w-6" : "h-[18px] w-[18px]", dark ? "text-brand-200" : "text-white")} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 18 L10 11 L14 15 L20 7" />
          <path d="M16 7 H20 V11" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className={cn("font-semibold tracking-tight", size === "lg" ? "text-[18px]" : "text-[15px]", dark ? "text-white" : "text-ink-900")}>
          Anwar <span className={dark ? "text-brand-200" : "text-brand-700"}>KPIFlow</span>
        </div>
        <div className={cn("text-[10px] uppercase tracking-[0.14em]", dark ? "text-white/45" : "text-ink-400")}>ANWAR KPI</div>
      </div>
    </div>
  );
}
