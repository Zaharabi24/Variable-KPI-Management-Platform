"use client";

import * as React from "react";
import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { inviteDepartmentHeadAction, addEmployeeAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import { Field, Input, Select, FormAlert } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { COMPANY_DOMAIN } from "@/lib/constants";

type Opt = { id: string; name: string };

export function InviteHeadButton({ units, departments }: { units: Opt[]; departments: Opt[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>Invite Department Head</Button>
      {open && <InviteDialog kind="head" units={units} departments={departments} onClose={() => setOpen(false)} />}
    </>
  );
}

export function AddEmployeeButton({ units, departments }: { units: Opt[]; departments: Opt[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>Add employee</Button>
      {open && <InviteDialog kind="employee" units={units} departments={departments} onClose={() => setOpen(false)} />}
    </>
  );
}

function InviteDialog({ kind, units, departments, onClose }: { kind: "head" | "employee"; units: Opt[]; departments: Opt[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(kind === "head" ? inviteDepartmentHeadAction : addEmployeeAction, null);
  const toast = useToast();
  React.useEffect(() => {
    if (state?.ok) { toast("success", state.message ?? "Sent."); onClose(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};
  return (
    <Dialog
      open
      onClose={onClose}
      title={kind === "head" ? "Invite a Department Head" : "Add an employee"}
      description={kind === "head" ? "The invitee receives a secure email link to set a password and is then assigned to the department as an approver." : "The employee receives a secure email link to set a password."}
      width="max-w-lg"
    >
      <form action={action} className="space-y-4" noValidate>
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="Full Name" htmlFor="inv-name" required error={e.fullName}><Input id="inv-name" name="fullName" defaultValue={v.fullName} invalid={!!e.fullName} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company Email" htmlFor="inv-email" required error={e.email} hint={`Must end in ${COMPANY_DOMAIN}`}><Input id="inv-email" name="email" type="email" defaultValue={v.email} invalid={!!e.email} /></Field>
          <Field label="Employee ID" htmlFor="inv-eid" required error={e.employeeId}><Input id="inv-eid" name="employeeId" defaultValue={v.employeeId} invalid={!!e.employeeId} /></Field>
          <Field label="Business Unit" htmlFor="inv-bu" required error={e.businessUnitId}>
            <Select id="inv-bu" name="businessUnitId" defaultValue={v.businessUnitId ?? ""} invalid={!!e.businessUnitId}>
              <option value="" disabled>Select</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Department" htmlFor="inv-dept" required error={e.departmentId}>
            <Select id="inv-dept" name="departmentId" defaultValue={v.departmentId ?? ""} invalid={!!e.departmentId}>
              <option value="" disabled>Select</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        </div>
        {kind === "head" ? (
          <Field label="Role" htmlFor="inv-role" required error={e.role} hint="Designation shown in the system, e.g. Head of Growth Analytics">
            <Input id="inv-role" name="role" defaultValue={v.role} placeholder="Head of Department" invalid={!!e.role} />
          </Field>
        ) : (
          <Field label="Designation" htmlFor="inv-des" hint="Optional, e.g. Sales Executive"><Input id="inv-des" name="designation" defaultValue={v.designation} /></Field>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>{kind === "head" ? "Send invitation" : "Add and send link"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
