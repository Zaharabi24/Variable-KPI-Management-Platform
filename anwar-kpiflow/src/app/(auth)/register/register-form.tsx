"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, FormAlert } from "@/components/ui/field";
import { COMPANY_DOMAIN } from "@/lib/constants";

type Opt = { id: string; name: string };

export function RegisterForm({ units, departments }: { units: Opt[]; departments: Opt[] }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};
  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink-900">Create your account</h1>
      <p className="text-[14px] text-ink-500 mt-1.5">
        Employees register with their <span className="font-medium text-ink-700">{COMPANY_DOMAIN}</span> email. A secure link to set your password will be emailed to you.
      </p>
      <form action={action} className="mt-7 space-y-4" noValidate>
        {state?.message && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="Full Name" htmlFor="fullName" required error={e.fullName}>
          <Input id="fullName" name="fullName" defaultValue={v.fullName} autoComplete="name" placeholder="e.g. Rafi Ahmed" invalid={!!e.fullName} />
        </Field>
        <Field label="Company Email Address" htmlFor="email" required error={e.email} hint={`Must end in ${COMPANY_DOMAIN}`}>
          <Input id="email" name="email" type="email" defaultValue={v.email} autoComplete="email" placeholder={`name${COMPANY_DOMAIN}`} invalid={!!e.email} />
        </Field>
        <Field label="Employee ID" htmlFor="employeeId" required error={e.employeeId}>
          <Input id="employeeId" name="employeeId" defaultValue={v.employeeId} placeholder="e.g. AG-1042" invalid={!!e.employeeId} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Business Unit" htmlFor="businessUnitId" required error={e.businessUnitId}>
            <Select id="businessUnitId" name="businessUnitId" defaultValue={v.businessUnitId ?? ""} invalid={!!e.businessUnitId}>
              <option value="" disabled>Select business unit</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Department" htmlFor="departmentId" required error={e.departmentId}>
            <Select id="departmentId" name="departmentId" defaultValue={v.departmentId ?? ""} invalid={!!e.departmentId}>
              <option value="" disabled>Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={pending}>Request account</Button>
        <p className="text-center text-[13px] text-ink-500">
          Already have an account? <Link href="/login" className="text-brand-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
