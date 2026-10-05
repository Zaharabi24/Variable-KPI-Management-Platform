"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { FileText, UploadCloud, X } from "lucide-react";
import { saveKpiAction } from "@/actions/kpi";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Drawer } from "@/components/ui/modal";
import { Field, Select, Textarea, FormAlert } from "@/components/ui/field";
import { RouteTracker } from "@/components/ui/tracker";
import { useToast } from "@/components/ui/toast";
import { MONTHS } from "@/lib/constants";
import { KPI_STATUS, type KpiView } from "@/lib/kpi";
import { cn, fmtBytes } from "@/lib/utils";
import { BreakdownCard, ScoreStrip, useKpiSheet } from "./kpi-sheet";

export type Approver = { id: string; fullName: string; designation: string | null };
export type KpiFormOwner = { fullName: string; employeeId: string };

/**
 * Create KPI side panel, also used to continue a draft and to correct a KPI the Department Head returned.
 * The employee fills the score breakdown, Evidence Report, Remarks and Approval Person.
 * The score strip underneath is shown but locked: the Department Head and the HR Admin complete it.
 */
export function KpiFormDrawer({
  open, onClose, owner, approvers, approverLabel, kpi = null,
}: {
  open: boolean;
  onClose: () => void;
  owner: KpiFormOwner;
  approvers: Approver[];
  approverLabel: string;
  /** A saved draft or a returned KPI; null for a new one. */
  kpi?: KpiView | null;
}) {
  const [state, action, pending] = useActionState(saveKpiAction, null);
  const toast = useToast();
  const router = useRouter();
  const e = state?.errors ?? {};
  const returned = kpi?.status === KPI_STATUS.RETURNED;

  const now = new Date(Date.now() + 6 * 3600 * 1000);
  const [year, setYear] = React.useState(String(kpi?.periodYear ?? now.getUTCFullYear()));
  const [month, setMonth] = React.useState(String(kpi?.periodMonth ?? now.getUTCMonth() + 1));
  const [remarks, setRemarks] = React.useState(kpi?.remarks ?? "");
  const [approverId, setApproverId] = React.useState(kpi?.approver?.id ?? (approvers.length === 1 ? approvers[0].id : ""));
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [intent, setIntent] = React.useState<"draft" | "submit">("submit");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const sheet = useKpiSheet(kpi);

  const years = Array.from({ length: 3 }, (_, i) => now.getUTCFullYear() - 2 + i);
  const future = Number(year) > now.getUTCFullYear() || (Number(year) === now.getUTCFullYear() && Number(month) > now.getUTCMonth() + 1);
  const draftValid = !future && sheet.tasks.some((t) => t.task.trim() || t.score.trim());
  const submitValid = !future && sheet.tasksComplete && !!approverId;

  React.useEffect(() => {
    if (state?.ok) {
      toast("success", state.message ?? "Saved.");
      onClose();
      router.refresh();
    } else if (state && !state.ok && state.message) {
      toast("error", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    setDragging(false);
    const f = ev.dataTransfer.files?.[0];
    if (f && fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      fileRef.current.files = dt.files;
      setFile(f);
    }
  };

  const formId = "kpi-form";
  const title = !kpi ? "Create KPI" : returned ? "Correct and resubmit KPI" : "Continue draft";
  const subtitle = returned
    ? "Correct what your Department Head asked for and submit again. The earlier version stays in the history."
    : "Score your five major tasks. Your Department Head and the HR Admin complete the rest after you submit.";
  const periodLabel = `Month of ${MONTHS[Number(month) - 1]} - ${year}`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      width="max-w-4xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-500">
            {future
              ? "Choose the current month or an earlier one."
              : submitValid ? "Ready to submit. After submission you cannot change anything." : draftValid ? "You can save a draft now. Submit enables when all five tasks, their scores and the Approval Person are filled." : "Enter at least one task to save a draft."}
          </p>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" form={formId} name="intent" value="draft" variant="secondary" disabled={!draftValid || pending} loading={pending && intent === "draft"} onClick={() => setIntent("draft")}>Save as Draft</Button>
            <Button type="submit" form={formId} name="intent" value="submit" disabled={!submitValid || pending} loading={pending && intent === "submit"} onClick={() => setIntent("submit")}>{returned ? "Resubmit KPI" : "Submit KPI"}</Button>
          </div>
        </div>
      }
    >
      <form id={formId} action={action} className="space-y-5" noValidate onKeyDown={(ev) => { if (ev.key === "Enter" && ev.target instanceof HTMLInputElement) ev.preventDefault(); }}>
        {kpi && <input type="hidden" name="kpiId" value={kpi.id} />}
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        {returned && kpi?.returnRemarks && (
          <FormAlert kind="error"><span className="font-semibold">Returned with remarks:</span> {kpi.returnRemarks}</FormAlert>
        )}

        <Card>
          <CardHeader title="KPI period" subtitle={returned ? "The month of a returned KPI cannot be changed." : "One KPI per month. Choose the month this KPI is for."} />
          <div className="px-5 pb-5 grid grid-cols-2 gap-4 max-w-md">
            <Field label="Month" htmlFor="periodMonth" required error={e.period}>
              <Select id="periodMonth" name="periodMonth" value={month} onChange={(ev) => setMonth(ev.target.value)} disabled={returned} invalid={!!e.period}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Year" htmlFor="periodYear" required>
              <Select id="periodYear" name="periodYear" value={year} onChange={(ev) => setYear(ev.target.value)} disabled={returned}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </Field>
            {returned && (<><input type="hidden" name="periodMonth" value={month} /><input type="hidden" name="periodYear" value={year} /></>)}
          </div>
        </Card>

        <BreakdownCard sheet={sheet} ownerLabel={`${owner.employeeId} ${owner.fullName}`} editable errors={e} />

        <Card>
          <div className="p-5 space-y-5">
            <Field
              label="Evidence Report"
              error={e.evidence}
              hint={kpi && kpi.evidence.length > 0 ? `Current: ${kpi.evidence.map((f) => f.fileName).join(", ")} · upload a new file to add it` : "PDF, image, Excel, Word, CSV or text · up to 4 MB · optional"}
            >
              <div
                onDragOver={(ev) => { ev.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn("rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors", dragging ? "border-brand-500 bg-brand-50" : e.evidence ? "border-red-300 bg-red-50/40" : "border-ink-200 bg-surface hover:border-ink-300")}
              >
                <input ref={fileRef} type="file" name="evidence" id="evidence" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc,.csv,.txt" onChange={(ev) => setFile(ev.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-5 w-5 text-brand-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-ink-900 truncate">{file.name}</div>
                        <div className="text-[12px] text-ink-500">{fmtBytes(file.size)}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-100" aria-label="Remove file">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="evidence" className="cursor-pointer block">
                    <UploadCloud className="h-6 w-6 mx-auto text-ink-400" />
                    <div className="mt-2 text-[13.5px] text-ink-700"><span className="font-medium text-brand-600">Choose a file</span> or drag it here</div>
                  </label>
                )}
              </div>
            </Field>

            <Field label="Remarks" htmlFor="remarks" error={e.remarks}>
              <Textarea id="remarks" name="remarks" placeholder="Explain the result and what the evidence shows." value={remarks} onChange={(ev) => setRemarks(ev.target.value)} invalid={!!e.remarks} maxLength={2000} />
            </Field>

            <Field label="Approval Person" htmlFor="approverId" required error={e.approverId} hint={approverLabel} className="max-w-md">
              <Select id="approverId" name="approverId" value={approverId} onChange={(ev) => setApproverId(ev.target.value)} invalid={!!e.approverId}>
                <option value="" disabled>{approvers.length === 0 ? "No approver available yet" : "Select"}</option>
                {approvers.map((a) => <option key={a.id} value={a.id}>{a.fullName}{a.designation ? ` · ${a.designation}` : ""}</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        {/* Shown so the employee sees the whole form; every cell here belongs to the Department Head or the HR Admin. */}
        <ScoreStrip
          sheet={sheet}
          periodLabel={periodLabel}
          edit={{ dept: false, hr: false }}
          visible={{ dept: false, hr: false }}
          pendingNote="You cannot enter these. Your Department Head fills KPI (5), Quality of work, Time Line of Deliverables and Stakeholder & Peer Review; the HR Admin fills Attendance, Remarks and HR Note, and the Total Score is then calculated."
        />

        <Card>
          <CardHeader title="Status routing" subtitle="Submit → Department Head Approval → HR Admin Approval → Finance Admin → Audit Admin" />
          <div className="px-5 pb-5"><RouteTracker status={kpi?.status ?? KPI_STATUS.DRAFT} /></div>
        </Card>
      </form>
    </Drawer>
  );
}
