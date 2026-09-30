"use client";

import * as React from "react";
import { useActionState } from "react";
import { updateProfileAction } from "@/actions/kpi";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function ProfileForm({
  user,
}: {
  user: { fullName: string; email: string; employeeId: string; businessUnit: string; department: string; corporatePhone: string | null; designation: string | null };
}) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const toast = useToast();
  React.useEffect(() => {
    if (state?.ok) toast("success", state.message ?? "Saved.");
  }, [state, toast]);

  return (
    <form action={action} className="space-y-4 max-w-2xl" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full Name" htmlFor="fullName"><Input id="fullName" value={user.fullName} disabled /></Field>
        <Field label="Company Email" htmlFor="email"><Input id="email" value={user.email} disabled /></Field>
        <Field label="Employee ID" htmlFor="employeeId"><Input id="employeeId" value={user.employeeId} disabled className="font-mono" /></Field>
        <Field label="Business Unit" htmlFor="bu"><Input id="bu" value={user.businessUnit} disabled /></Field>
        <Field label="Department" htmlFor="dept"><Input id="dept" value={user.department} disabled /></Field>
        <Field label="Designation" htmlFor="designation" hint="Shown on the leaderboard">
          <Input id="designation" name="designation" defaultValue={state?.values?.designation ?? user.designation ?? ""} placeholder="e.g. Sales Executive" />
        </Field>
        <Field label="Corporate Phone Number" htmlFor="corporatePhone" error={state?.errors?.corporatePhone} hint="Optional">
          <Input id="corporatePhone" name="corporatePhone" type="tel" defaultValue={state?.values?.corporatePhone ?? user.corporatePhone ?? ""} placeholder="+880 17xx xxxxxx" invalid={!!state?.errors?.corporatePhone} />
        </Field>
      </div>
      <div className="pt-2">
        <Button type="submit" loading={pending}>Save changes</Button>
      </div>
    </form>
  );
}
