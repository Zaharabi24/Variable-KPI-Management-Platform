"use client";

import * as React from "react";
import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { inviteFinanceAdminAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import { Field, Input, Select, FormAlert } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { COMPANY_DOMAIN } from "@/lib/constants";

type Opt = { id: string; name: string };

export function InviteFinanceAdminButton({ units }: { units: Opt[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>Invite Finance Admin</Button>
      {open && <InviteDialog units={units} onClose={() => setOpen(false)} />}
    </>
  );
}

function InviteDialog({ units, onClose }: { units: Opt[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(inviteFinanceAdminAction, null);
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
      title="Invite a Finance Admin"
      description="The invitee receives a secure, single-use link to set their own password. They then see approved Variable Pay requests from every department and confirm payment."
      width="max-w-lg"
    >
      <form action={action} className="space-y-4" noValidate>
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="Full Name" htmlFor="fin-name" required error={e.fullName}><Input id="fin-name" name="fullName" defaultValue={v.fullName} invalid={!!e.fullName} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company Email" htmlFor="fin-email" required error={e.email} hint={`Must end in ${COMPANY_DOMAIN}`}><Input id="fin-email" name="email" type="email" defaultValue={v.email} invalid={!!e.email} /></Field>
          <Field label="Employee ID" htmlFor="fin-eid" required error={e.employeeId}><Input id="fin-eid" name="employeeId" defaultValue={v.employeeId} invalid={!!e.employeeId} /></Field>
          <Field label="Business Unit" htmlFor="fin-bu" required error={e.businessUnitId}>
            <Select id="fin-bu" name="businessUnitId" defaultValue={v.businessUnitId ?? ""} invalid={!!e.businessUnitId}>
              <option value="" disabled>Select</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Designation" htmlFor="fin-des" hint="Optional, e.g. Finance Manager"><Input id="fin-des" name="designation" defaultValue={v.designation} placeholder="Finance Admin" /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>Send invitation</Button>
        </div>
      </form>
    </Dialog>
  );
}
