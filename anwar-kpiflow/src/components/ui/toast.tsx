"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; kind: "success" | "error"; message: string };
const Ctx = React.createContext<{ toast: (kind: Toast["kind"], message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const toast = React.useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-fade-up card px-4 py-3 flex items-start gap-3 shadow-pop",
              t.kind === "success" ? "border-brand-200" : "border-red-200",
            )}
          >
            {t.kind === "success" ? <CheckCircle2 className="h-5 w-5 text-brand-700 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />}
            <p className="text-[13.5px] text-ink-900 flex-1">{t.message}</p>
            <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="text-ink-400 hover:text-ink-700" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
