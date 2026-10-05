"use client";

import * as React from "react";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiFormDrawer, type Approver, type KpiFormOwner } from "@/components/kpi/kpi-form";
import { KPI_STATUS, type KpiView } from "@/lib/kpi";

/** Owner action on a Draft ("Continue draft") or a Returned KPI ("Correct and resubmit"). */
export function ResubmitButton({ kpi, owner, approvers, approverLabel }: { kpi: KpiView; owner: KpiFormOwner; approvers: Approver[]; approverLabel: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" className="h-9" icon={<PencilLine className="h-4 w-4" />} onClick={() => setOpen(true)}>
        {kpi.status === KPI_STATUS.DRAFT ? "Continue draft" : "Correct and resubmit"}
      </Button>
      {open && <KpiFormDrawer open onClose={() => setOpen(false)} owner={owner} approvers={approvers} approverLabel={approverLabel} kpi={kpi} />}
    </>
  );
}
