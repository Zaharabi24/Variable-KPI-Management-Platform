"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { setupPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, PasswordInput, FormAlert } from "@/components/ui/field";
import { PASSWORD_POLICY } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SetupPasswordForm({
  token,
  type,
  user,
}: {
  token: string;
  type: string;
  user: { fullName: string; email: string; role: string; department: string | null };
}) {
  const [state, action, pending] = useActionState(setupPasswordAction, null);
  const [pw, setPw] = React.useState("");
  const [cf, setCf] = React.useState("");
  const e = state?.errors ?? {};

  const checks = [
    { label: "At least 8 characters", ok: pw.length >= PASSWORD_POLICY.minLength },
    { label: "One uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "One lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "One number", ok: /\d/.test(pw) },
  ];
  const strong = checks.every((c) => c.ok);
  const match = pw.length > 0 && pw === cf;
  const canSubmit = strong && match;

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink-900">{type === "RESET" ? "Reset your password" : "Set your password"}</h1>
      <p className="text-[14px] text-ink-500 mt-1.5">
        Welcome, <span className="font-medium text-ink-900">{user.fullName}</span>. You are joining as <span className="font-medium text-ink-900">{user.role}</span>
        {user.department ? <> in <span className="font-medium text-ink-900">{user.department}</span></> : null}.
      </p>

      <form action={action} className="mt-7 space-y-4" noValidate>
        <input type="hidden" name="token" value={token} />
        {state?.message && (
          <FormAlert kind="error">
            {state.message} <Link href="/forgot-password" className="underline font-medium">Request a new link</Link>
          </FormAlert>
        )}
        <Field label="New Password" htmlFor="password" required error={e.password}>
          <PasswordInput id="password" name="password" autoComplete="new-password" value={pw} onChange={(ev) => setPw(ev.target.value)} invalid={!!e.password} />
        </Field>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]" aria-label="Password requirements">
          {checks.map((c) => (
            <li key={c.label} className={cn("flex items-center gap-1.5", c.ok ? "text-brand-700" : "text-ink-400")}>
              {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {c.label}
            </li>
          ))}
        </ul>
        <Field
          label="Confirm Password"
          htmlFor="confirm"
          required
          error={e.confirm ?? (cf.length > 0 && !match ? "New Password and Confirm Password do not match." : undefined)}
          hint={match ? <span className="text-brand-700">Passwords match.</span> : undefined}
        >
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" value={cf} onChange={(ev) => setCf(ev.target.value)} invalid={!!e.confirm || (cf.length > 0 && !match)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!canSubmit}>
          Create password and continue
        </Button>
      </form>
    </div>
  );
}
