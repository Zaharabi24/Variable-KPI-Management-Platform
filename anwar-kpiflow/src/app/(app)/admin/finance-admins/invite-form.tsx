"use client";

import * as React from "react";
import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { inviteStageAdminAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import { Field, Input, Select, FormAlert } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { COMPANY_DOMAIN, ROLE_LABELS, type Role } from "@/lib/constants";

type Opt = { id: string; name: string };

/** Invite an HR Admin, a Finance Admin or an Audit Admin. `what` says what the invitee will do, for the dialog text. */
export function InviteStageAdminButton({ units, role, what }: { units: Opt[]; role: Role; what: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>Invite {ROLE_LABELS[role]}</Button>
      {open && <InviteDialog units={units} role={role} what={what} onClose={() => setOpen(false)} />}
    </>
  );
}

function InviteDialog({ units, role, what, onClose }: { units: Opt[]; role: Role; what: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(inviteStageAdminAction, null);
  const toast = useToast();
  React.useEffect(() => {
    if (state?.ok) { toast("success", state.message ?? "Sent."); onClose(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};
  const label = ROLE_LABELS[role];
  return (
    <Dialog open onClose={onClose} title={`Invite ${role === "FINANCE_ADMIN" ? "a" : "an"} ${label}`} description={`The invitee receives a secure, single-use link to set their own password. ${what}`} width="max-w-lg">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="adminRole" value={role} />
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="Full Name" htmlFor="adm-name" required error={e.fullName}><Input id="adm-name" name="fullName" defaultValue={v.fullName} invalid={!!e.fullName} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company Email" htmlFor="adm-email" required error={e.email} hint={`Must end in ${COMPANY_DOMAIN}`}><Input id="adm-email" name="email" type="email" defaultValue={v.email} invalid={!!e.email} /></Field>
          <Field label="Employee ID" htmlFor="adm-eid" required error={e.employeeId}><Input id="adm-eid" name="employeeId" defaultValue={v.employeeId} invalid={!!e.employeeId} /></Field>
          <Field label="Business Unit" htmlFor="adm-bu" required error={e.businessUnitId}>
            <Select id="adm-bu" name="businessUnitId" defaultValue={v.businessUnitId ?? ""} invalid={!!e.businessUnitId}>
              <option value="" disabled>Select</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Designation" htmlFor="adm-des" hint="Optional"><Input id="adm-des" name="designation" defaultValue={v.designation} placeholder={label} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>Send invitation</Button>
        </div>
      </form>
    </Dialog>
  );
}
