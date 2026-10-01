"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput, FormAlert, Select } from "@/components/ui/field";
import type { DemoAccount } from "@/lib/demo";

export function LoginForm({ setupDone, demo, next }: { setupDone: boolean; demo: DemoAccount[]; next?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [picked, setPicked] = React.useState("");

  // One account per user type for the quick-sign-in dropdown.
  const quick = [
    { key: "SUPER_ADMIN", label: "Super Admin Account", account: demo.find((d) => d.role === "Super Admin") },
    { key: "SYSTEM_ADMIN", label: "System Admin Account", account: demo.find((d) => d.role === "System Admin") },
    { key: "DEPARTMENT_HEAD", label: "Department Head Account", account: demo.find((d) => d.role === "Department Head") },
    { key: "EMPLOYEE", label: "Employee Account", account: demo.find((d) => d.role === "Employee") },
  ].filter((q) => q.account) as { key: string; label: string; account: DemoAccount }[];

  const pick = (key: string) => {
    setPicked(key);
    const q = quick.find((x) => x.key === key);
    if (q) {
      setEmail(q.account.email);
      setPassword(q.account.password);
    }
  };
  const chosen = quick.find((q) => q.key === picked)?.account;

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink-900">Sign in</h1>
      <p className="text-[14px] text-ink-500 mt-1.5">Use your company email and password.</p>

      <form action={action} className="mt-7 space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {setupDone && <FormAlert kind="success">Password created. Sign in to continue.</FormAlert>}
        {state?.message && <FormAlert kind="error">{state.message}</FormAlert>}

        <Field label="Demo account" htmlFor="demo-account" hint={chosen ? `${chosen.name} · ${chosen.department}` : "Pick a user type to fill the form, then press Sign in."}>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-700 pointer-events-none" />
            <Select id="demo-account" className="pl-9" value={picked} onChange={(e) => pick(e.target.value)}>
              <option value="">Select a demo account…</option>
              {quick.map((q) => (
                <option key={q.key} value={q.key}>{q.label}</option>
              ))}
            </Select>
          </div>
        </Field>

        <Field label="Company Email" htmlFor="email" required error={state?.errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="username" placeholder="you@anwargroup.net" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!state?.errors?.email} />
        </Field>
        <Field label="Password" htmlFor="password" required error={state?.errors?.password}>
          <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!state?.errors?.password} />
        </Field>
        <div className="flex items-center justify-between text-[13px]">
          <Link href="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link>
          <Link href="/register" className="text-ink-500 hover:text-ink-900">Create an account</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={pending}>Sign in</Button>
      </form>

      <p className="mt-6 text-[12.5px] text-ink-400">
        Other employee and Department Head accounts are listed in <span className="font-mono">docs/DEMO_ACCOUNTS.md</span>.
      </p>
    </div>
  );
}
