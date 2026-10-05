import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Anwar brand lock-up: the ANWARS "Since 1834" mark with the product wordmark.
 * `light` = dark mark on white surfaces (sidebar, top bar); `dark` = white mark on the brand red.
 */
export function Logo({ variant = "light", size = "md", className }: { variant?: "light" | "dark"; size?: "md" | "lg"; className?: string }) {
  const dark = variant === "dark";
  const h = size === "lg" ? 56 : 40;
  const w = Math.round(h * (400 / 276));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src={dark ? "/brand/anwars-logo-white.png" : "/brand/anwars-logo.png"}
        alt="Anwars — Since 1834"
        width={w}
        height={h}
        priority
        className="shrink-0 select-none"
        style={{ width: w, height: h }}
      />
      <div className={cn("leading-tight border-l pl-3", dark ? "border-white/30" : "border-ink-200")}>
        <div className={cn("font-semibold tracking-tight", size === "lg" ? "text-[18px]" : "text-[15px]", dark ? "text-white" : "text-ink-900")}>
          Anwar <span className={dark ? "text-white" : "text-brand-500"}>KPIFlow</span>
        </div>
        <div className={cn("text-[10px] uppercase tracking-[0.14em]", dark ? "text-white/90" : "text-ink-400")}>ANWAR KPI</div>
      </div>
    </div>
  );
}
