import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto scroll-thin", className)}>
      <table className="w-full text-[13.5px] border-collapse min-w-[720px] [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-ink-100/40 [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
    </div>
  );
}

export function Th({ children, align = "left", className }: { children?: React.ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 bg-[#fafafb] text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500 px-4 py-3 border-y border-ink-100 whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "left", mono, className }: { children?: React.ReactNode; align?: "left" | "right" | "center"; mono?: boolean; className?: string }) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 border-b border-ink-100 align-middle text-ink-900",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "font-mono tnum text-[13px]",
        className,
      )}
    >
      {children}
    </td>
  );
}
