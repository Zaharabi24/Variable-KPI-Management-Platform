"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function useEscape(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
}

/** Right-side drawer (Section 15.4 / 15.7). */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-2xl",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div className={cn("relative h-full w-full bg-surface shadow-pop flex flex-col animate-slide-in", width)}>
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-ink-100 bg-white">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-ink-900 truncate">{title}</h2>
            {subtitle && <p className="text-[13px] text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label="Close">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-5">{children}</div>
        {footer && <div className="border-t border-ink-100 bg-white px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Centered dialog for confirmations and short reason forms. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div className={cn("relative w-full card p-6 shadow-pop animate-fade-up", width)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink-900">{title}</h2>
            {description && <p className="text-[13px] text-ink-500 mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
