"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "subtle";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-button hover:from-brand-600 hover:to-brand-700 active:from-brand-700 active:to-brand-700",
  secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-100",
  outline: "bg-white text-ink-700 border border-ink-200 shadow-field hover:bg-ink-100/50 hover:border-ink-300 hover:text-ink-900",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100/70 hover:text-ink-900",
  subtle: "bg-ink-100/70 text-ink-700 hover:bg-ink-200/70",
  danger: "bg-gradient-to-b from-red-600 to-red-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(127,29,29,0.3)] hover:from-red-700 hover:to-red-800",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-[14px] rounded-[10px] gap-2",
  lg: "h-11 px-5 text-[15px] rounded-xl gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",
        "transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98]",
        "disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
