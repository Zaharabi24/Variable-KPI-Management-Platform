"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    // Scrolling the page with the pointer over a focused number box would silently change its value; drop focus instead.
    const onWheel = props.type === "number" ? (ev: React.WheelEvent<HTMLInputElement>) => { ev.currentTarget.blur(); props.onWheel?.(ev); } : props.onWheel;
    return <input ref={ref} className={cn("input", invalid && "input-error", className)} aria-invalid={invalid || undefined} {...props} onWheel={onWheel} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, defaultValue, ...props }, ref) {
    const inner = React.useRef<HTMLSelectElement | null>(null);
    // React applies a <select>'s defaultValue only at mount; after a server action resets the form,
    // re-apply the echoed value so the user's choice is not lost (see actions/form.ts).
    React.useEffect(() => {
      if (defaultValue !== undefined && inner.current && props.value === undefined) inner.current.value = String(defaultValue);
    }, [defaultValue, props.value]);
    const setRef = (el: HTMLSelectElement | null) => {
      inner.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLSelectElement | null>).current = el;
    };
    return (
      <select ref={setRef} defaultValue={defaultValue} className={cn("input pr-8 appearance-none bg-no-repeat bg-[right_0.6rem_center] bg-[length:16px]", invalid && "input-error", className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23696973' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")" }}
        aria-invalid={invalid || undefined} {...props}>
        {children}
      </select>
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return <textarea ref={ref} className={cn("input h-auto min-h-[88px] py-2 resize-y", invalid && "input-error", className)} aria-invalid={invalid || undefined} {...props} />;
  },
);

/** FR-AUTH-08 — password field with eye on / eye off toggle that always reflects the current state. */
export function PasswordInput({ className, invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className={cn("input pr-11", invalid && "input-error", className)} aria-invalid={invalid || undefined} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-400 hover:text-ink-700 rounded-r-lg"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function FormAlert({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-brand-50 border-brand-200 text-brand-900",
    info: "bg-sky-50 border-sky-200 text-sky-900",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-[13px] leading-5", styles)}>
      {children}
    </div>
  );
}
