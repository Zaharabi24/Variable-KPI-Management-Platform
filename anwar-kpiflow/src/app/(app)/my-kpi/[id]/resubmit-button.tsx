"use client";

import * as React from "react";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiFormDrawer, type KpiFormInitial } from "@/components/kpi/kpi-form";

export function ResubmitButton({
  initial,
  approvers,
  approverLabel,
}: {
  initial: KpiFormInitial;
  approvers: { id: string; fullName: string; designation: string | null }[];
  approverLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" className="h-9" icon={<PencilLine className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Correct and resubmit
      </Button>
      <KpiFormDrawer open={open} onClose={() => setOpen(false)} approvers={approvers} approverLabel={approverLabel} initial={initial} />
    </>
  );
}
