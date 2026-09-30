"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, FormAlert } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink-900">Request a secure link</h1>
      <p className="text-[14px] text-ink-500 mt-1.5">Enter your company email. We will send a single-use link to set a new password.</p>
      <form action={action} className="mt-7 space-y-4" noValidate>
        {state?.ok && state.message && (
          <FormAlert kind="success">
            {state.message} <Link href="/dev/outbox" className="underline font-medium">Open Outbox</Link>
          </FormAlert>
        )}
        <Field label="Company Email" htmlFor="email" required error={state?.errors?.email}>
          <Input id="email" name="email" type="email" defaultValue={state?.values?.email} placeholder="you@anwargroup.net" invalid={!!state?.errors?.email} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending}>Send link</Button>
        <p className="text-center text-[13px] text-ink-500">
          <Link href="/login" className="text-brand-700 hover:underline">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
