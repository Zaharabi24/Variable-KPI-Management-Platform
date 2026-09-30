"use client";

import * as React from "react";
import { useActionState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { createKpiAction, resubmitKpiAction } from "@/actions/kpi";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, FormAlert } from "@/components/ui/field";
import { Drawer } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { achievementPct, calculatedScore, fmtPct, fmtNum } from "@/lib/calc";
import { MONTHS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import { cn, fmtBytes } from "@/lib/utils";

type Approver = { id: string; fullName: string; designation: string | null };

export type KpiFormInitial = {
  id: string;
  name: string;
  category: string;
  periodYear: number;
  periodMonth: number;
  target: number;
  actual: number;
  unit: string;
  weight: number;
  remarks: string;
  approverId: string;
  status: string;
  returnRemarks: string | null;
  evidenceNames: string[];
};

/** Section 15.4 — Create KPI form (side panel), also used for resubmitting a Returned KPI. */
export function KpiFormDrawer({
  open,
  onClose,
  approvers,
  approverLabel,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  approvers: Approver[];
  approverLabel: string;
  initial?: KpiFormInitial;
}) {
  const isEdit = !!initial;
  const [state, action, pending] = useActionState(isEdit ? resubmitKpiAction : createKpiAction, null);
  const toast = useToast();
  const e = state?.errors ?? {};

  const now = new Date(Date.now() + 6 * 3600 * 1000);
  const [name, setName] = React.useState(initial?.name ?? "");
  const [category, setCategory] = React.useState(initial?.category ?? "");
  const [year, setYear] = React.useState(String(initial?.periodYear ?? now.getUTCFullYear()));
  const [month, setMonth] = React.useState(String(initial?.periodMonth ?? now.getUTCMonth() + 1));
  const [target, setTarget] = React.useState(initial ? String(initial.target) : "");
  const [actual, setActual] = React.useState(initial ? String(initial.actual) : "");
  const [unit, setUnit] = React.useState(initial?.unit ?? "");
  const [weight, setWeight] = React.useState(initial ? String(initial.weight) : "");
  const [remarks, setRemarks] = React.useState(initial?.remarks ?? "");
  const [approverId, setApproverId] = React.useState(initial?.approverId ?? (approvers.length === 1 ? approvers[0].id : ""));
  const [file, setFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const t = Number(target);
  const a = Number(actual);
  const ach = t > 0 && actual !== "" && !Number.isNaN(a) ? achievementPct(t, a) : null;
  const score = ach !== null ? calculatedScore(ach) : null;

  const w = Number(weight);
  const valid =
    name.trim().length >= 2 &&
    !!category &&
    t > 0 &&
    actual !== "" && a >= 0 &&
    w > 0 && w <= 100 &&
    remarks.trim().length >= 3 &&
    !!approverId &&
    (isEdit ? true : !!file);

  React.useEffect(() => {
    if (state?.ok) {
      toast("success", state.message ?? "Submitted.");
      onClose();
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
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Correct and resubmit KPI" : "Create KPI"}
      subtitle={isEdit ? "The previous version is kept in history." : "All fields are required. Achievement and Score are calculated for you."}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-500">{valid ? "Ready to submit." : "Submit enables when every required field is valid."}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" form={formId} disabled={!valid} loading={pending}>{isEdit ? "Resubmit KPI" : "Submit KPI"}</Button>
          </div>
        </div>
      }
    >
      <form id={formId} action={action} className="space-y-5" noValidate>
        {isEdit && <input type="hidden" name="kpiId" value={initial!.id} />}
        {isEdit && initial?.returnRemarks && (
          <FormAlert kind="error">
            <span className="font-semibold">Returned with remarks:</span> {initial.returnRemarks}
          </FormAlert>
        )}
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}

        <Field label="KPI" htmlFor="name" required error={e.name}>
          <Input id="name" name="name" placeholder="e.g. Upsell Revenue" value={name} onChange={(ev) => setName(ev.target.value)} invalid={!!e.name} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="KPI Category" htmlFor="category" required error={e.category}>
            <Select id="category" name="category" value={category} onChange={(ev) => setCategory(ev.target.value)} invalid={!!e.category}>
              <option value="" disabled>Select category</option>
              <option value="PROJECT">Project KPI</option>
              <option value="PEOPLE_CULTURE">People &amp; Culture KPI</option>
            </Select>
          </Field>
          <div>
            <span className="label">KPI Period<span className="text-red-500 ml-0.5">*</span></span>
            <div className="grid grid-cols-[1fr_92px] gap-2">
              <Select name="periodMonth" aria-label="Period month" value={month} onChange={(ev) => setMonth(ev.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
              <Select name="periodYear" aria-label="Period year" value={year} onChange={(ev) => setYear(ev.target.value)}>
                {[now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_1fr_110px] gap-4">
          <Field label="Target" htmlFor="target" required error={e.target}>
            <Input id="target" name="target" type="number" inputMode="decimal" step="any" min="0" placeholder="500000" className="font-mono" value={target} onChange={(ev) => setTarget(ev.target.value)} invalid={!!e.target} />
          </Field>
          <Field label="Actual" htmlFor="actual" required error={e.actual}>
            <Input id="actual" name="actual" type="number" inputMode="decimal" step="any" min="0" placeholder="610000" className="font-mono" value={actual} onChange={(ev) => setActual(ev.target.value)} invalid={!!e.actual} />
          </Field>
          <Field label="Unit" htmlFor="unit" hint="optional">
            <Input id="unit" name="unit" placeholder="BDT" maxLength={20} value={unit} onChange={(ev) => setUnit(ev.target.value)} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Achievement" htmlFor="achievement" hint="Actual ÷ Target × 100">
            <Input id="achievement" readOnly value={ach === null ? "" : fmtPct(ach)} placeholder="—" className="font-mono bg-ink-100/50" tabIndex={-1} />
          </Field>
          <Field label="KPI Weight (%)" htmlFor="weight" required error={e.weight}>
            <Input id="weight" name="weight" type="number" inputMode="decimal" step="any" min="0" max="100" placeholder="15" className="font-mono" value={weight} onChange={(ev) => setWeight(ev.target.value)} invalid={!!e.weight} />
          </Field>
          <Field label="Score" htmlFor="score" hint="Calculated, no curve">
            <Input id="score" readOnly value={score === null ? "" : fmtNum(score)} placeholder="—" className="font-mono bg-ink-100/50" tabIndex={-1} />
          </Field>
        </div>

        <Field label="Evidence Report" required={!isEdit} error={e.evidence} hint={isEdit ? `Current: ${initial!.evidenceNames.join(", ") || "none"} · upload a new file to replace it in this version` : "PDF, image, Excel, Word, CSV or text · up to 10 MB"}>
          <div
            onDragOver={(ev) => { ev.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
              dragging ? "border-brand-500 bg-brand-50" : e.evidence ? "border-red-300 bg-red-50/40" : "border-ink-200 bg-surface hover:border-ink-300",
            )}
          >
            <input ref={fileRef} type="file" name="evidence" id="evidence" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc,.csv,.txt" onChange={(ev) => setFile(ev.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-5 w-5 text-brand-700 shrink-0" />
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
                <div className="mt-2 text-[13.5px] text-ink-700"><span className="font-medium text-brand-700">Choose a file</span> or drag it here</div>
              </label>
            )}
          </div>
        </Field>

        <Field label="Remarks" htmlFor="remarks" required error={e.remarks}>
          <Textarea id="remarks" name="remarks" placeholder="Explain the result and what the evidence shows." value={remarks} onChange={(ev) => setRemarks(ev.target.value)} invalid={!!e.remarks} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className="label">KPI Status</span>
            <div className="h-10 flex items-center"><StatusBadge status={isEdit ? initial!.status : "SUBMITTED"} label={isEdit ? undefined : "Submitted on save"} /></div>
          </div>
          <Field label="Approval Person" htmlFor="approverId" required error={e.approverId} hint={approverLabel}>
            <Select id="approverId" name="approverId" value={approverId} onChange={(ev) => setApproverId(ev.target.value)} invalid={!!e.approverId}>
              <option value="" disabled>{approvers.length ? "Select approver" : "No approver available yet"}</option>
              {approvers.map((p) => <option key={p.id} value={p.id}>{p.fullName}{p.designation ? ` · ${p.designation}` : ""}</option>)}
            </Select>
          </Field>
        </div>
      </form>
    </Drawer>
  );
}
