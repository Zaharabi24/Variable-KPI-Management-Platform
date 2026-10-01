"use client";

import * as React from "react";
import { useActionState } from "react";
import { PencilLine, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import { Field, Input, Textarea, FormAlert } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { KpiFormDrawer, type KpiFormInitial, type KpiFormMode } from "@/components/kpi/kpi-form";
import { changeTargetAction } from "@/actions/kpi";
import { fmtNum } from "@/lib/calc";

/** Owner action on a Draft ("Continue draft") or a Returned KPI ("Correct and resubmit"). */
export function ResubmitButton({
  initial,
  approvers,
  approverLabel,
  mode,
}: {
  initial: KpiFormInitial;
  approvers: { id: string; fullName: string; designation: string | null }[];
  approverLabel: string;
  mode: KpiFormMode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" className="h-9" icon={<PencilLine className="h-4 w-4" />} onClick={() => setOpen(true)}>
        {mode === "draft" ? "Continue draft" : "Correct and resubmit"}
      </Button>
      <KpiFormDrawer open={open} onClose={() => setOpen(false)} approvers={approvers} approverLabel={approverLabel} initial={initial} mode={mode} />
    </>
  );
}

/** Department Head / System Admin / Super Admin: change a fixed target with a reason. */
export function ChangeTargetButton({ kpiId, currentTarget, unit }: { kpiId: string; currentTarget: number; unit: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(changeTargetAction, null);
  const toast = useToast();
  React.useEffect(() => {
    if (state?.ok) { toast("success", state.message ?? "Target changed."); setOpen(false); }
    else if (state?.message) toast("error", state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <>
      <Button size="sm" variant="outline" className="h-9" icon={<Target className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Change target
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Change target" description="The employee set this target once and cannot change it. Your change is recorded with your name and reason and is visible to the employee.">
          <form action={action} className="space-y-4" noValidate>
            <input type="hidden" name="kpiId" value={kpiId} />
            {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
            <Field label="New target" htmlFor="ct-target" required error={state?.errors?.target} hint={`Current: ${fmtNum(currentTarget)} ${unit}`}>
              <Input id="ct-target" name="target" type="number" step="any" min="0" className="font-mono" defaultValue={state?.values?.target ?? currentTarget} autoFocus />
            </Field>
            <Field label="Reason" htmlFor="ct-reason" required error={state?.errors?.reason}>
              <Textarea id="ct-reason" name="reason" defaultValue={state?.values?.reason} placeholder="Why the target is being changed." />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={pending}>Change target</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
