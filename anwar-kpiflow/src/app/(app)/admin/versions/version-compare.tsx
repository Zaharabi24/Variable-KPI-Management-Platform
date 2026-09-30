"use client";

import * as React from "react";
import { Select } from "@/components/ui/field";
import { FIELD_LABELS, TRACKED_FIELDS } from "@/lib/versions";
import { CATEGORY_LABELS, MONTHS, type KpiCategory } from "@/lib/constants";
import { fmtDateTime, cn } from "@/lib/utils";
import { fmtNum } from "@/lib/calc";

type V = { id: string; versionNo: number; action: string; snapshot: string; changes: string; reason: string | null; createdAt: string; changedBy: string };

/** FR-AUD-03 / Section 15.10 — version list with side-by-side comparison of changed fields. */
export function VersionCompare({ versions }: { versions: V[] }) {
  const last = versions[versions.length - 1];
  const [a, setA] = React.useState(versions.length > 1 ? versions[versions.length - 2].id : last.id);
  const [b, setB] = React.useState(last.id);
  const va = versions.find((v) => v.id === a) ?? last;
  const vb = versions.find((v) => v.id === b) ?? last;
  const sa = parse(va.snapshot);
  const sb = parse(vb.snapshot);

  const rows = TRACKED_FIELDS.filter((f) => f !== "approverId").map((f) => ({ field: f as string, a: sa[f as string], b: sb[f as string] }));

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {versions.map((v) => (
          <li key={v.id}>
            <button
              onClick={() => { setA(b); setB(v.id); }}
              className={cn("rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors", v.id === b ? "border-brand-500 bg-brand-50" : v.id === a ? "border-ink-400 bg-ink-100/60" : "border-ink-200 bg-white hover:border-ink-300")}
            >
              <div className="font-semibold text-ink-900">v{v.versionNo} · {v.action.charAt(0) + v.action.slice(1).toLowerCase()}</div>
              <div className="text-ink-500">{v.changedBy} · {fmtDateTime(v.createdAt)}</div>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <span className="label">Compare</span>
          <Select value={a} onChange={(e) => setA(e.target.value)}>{versions.map((v) => <option key={v.id} value={v.id}>v{v.versionNo} · {v.action} · {v.changedBy}</option>)}</Select>
        </div>
        <div>
          <span className="label">with</span>
          <Select value={b} onChange={(e) => setB(e.target.value)}>{versions.map((v) => <option key={v.id} value={v.id}>v{v.versionNo} · {v.action} · {v.changedBy}</option>)}</Select>
        </div>
      </div>

      {vb.reason && <div className="rounded-lg bg-surface border border-ink-100 px-3 py-2 text-[13px]"><span className="font-medium">Reason for v{vb.versionNo}:</span> {vb.reason}</div>}

      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-ink-500">
            <th className="text-left py-2 pr-3 font-semibold">Field</th>
            <th className="text-right py-2 px-3 font-semibold">v{va.versionNo}</th>
            <th className="text-right py-2 pl-3 font-semibold">v{vb.versionNo}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const changed = (r.a ?? null) !== (r.b ?? null);
            return (
              <tr key={r.field} className={cn("border-t border-ink-100", changed && "bg-amber-50/60")}>
                <td className="py-2 pr-3 text-ink-500">{FIELD_LABELS[r.field] ?? r.field}{changed && <span className="ml-2 text-[10px] font-semibold uppercase text-amber-700">changed</span>}</td>
                <td className={cn("py-2 px-3 text-right font-mono tnum", changed ? "text-ink-400 line-through" : "text-ink-700")}>{fmt(r.field, r.a)}</td>
                <td className={cn("py-2 pl-3 text-right font-mono tnum", changed ? "text-ink-900 font-semibold" : "text-ink-700")}>{fmt(r.field, r.b)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function parse(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}
function fmt(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "category") return CATEGORY_LABELS[v as KpiCategory] ?? String(v);
  if (field === "periodMonth") return MONTHS[Number(v) - 1] ?? String(v);
  if (field === "periodYear") return String(v);
  if (field === "status") return String(v).charAt(0) + String(v).slice(1).toLowerCase();
  if (typeof v === "number") return fmtNum(v);
  const s = String(v);
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
}
