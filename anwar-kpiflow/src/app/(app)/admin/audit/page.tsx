import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Pill } from "@/components/ui/badge";
import { ROLES } from "@/lib/constants";
import { fmtDateTime, titleCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit Trail" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(ROLES.SUPER_ADMIN);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 60;
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
    db.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <>
      <PageHeader title="Audit Trail" subtitle="Append-only record of account events, submissions, decisions, edits, deletions and evidence access. No user can edit it." />
      <Card>
        <CardHeader title="Events" subtitle={`${total.toLocaleString()} entries · newest first`} action={<span className="text-[12.5px] text-ink-400 tnum">Page {page} of {pages}</span>} />
        <Table>
          <thead><tr><Th>When</Th><Th>Who</Th><Th>Action</Th><Th>Entity</Th><Th>Details</Th></tr></thead>
          <tbody>
            {logs.map((l) => {
              const details = safe(l.details);
              return (
                <tr key={l.id} className="hover:bg-surface/70">
                  <Td className="whitespace-nowrap text-ink-500 tnum">{fmtDateTime(l.createdAt)}</Td>
                  <Td>{l.user ? <><div className="font-medium">{l.user.fullName}</div><div className="text-[11.5px] text-ink-400">{l.user.email}</div></> : <span className="text-ink-400">anonymous</span>}</Td>
                  <Td><Pill tone={toneFor(l.action)}>{titleCase(l.action)}</Pill></Td>
                  <Td className="whitespace-nowrap">{l.entityType}{l.entityId ? <span className="font-mono text-[11px] text-ink-400 ml-1.5">{l.entityId.slice(-8)}</span> : null}</Td>
                  <Td><span className="font-mono text-[11.5px] text-ink-600 break-all">{details}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-100 text-[13px]">
          <a href={`?page=${Math.max(1, page - 1)}`} className={`text-brand-700 hover:underline ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>← Newer</a>
          <a href={`?page=${Math.min(pages, page + 1)}`} className={`text-brand-700 hover:underline ${page >= pages ? "pointer-events-none opacity-40" : ""}`}>Older →</a>
        </div>
      </Card>
    </>
  );
}

function safe(s: string): string {
  try {
    const o = JSON.parse(s);
    const parts = Object.entries(o).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    const out = parts.join("  ");
    return out.length > 180 ? out.slice(0, 177) + "…" : out || "—";
  } catch {
    return s;
  }
}
function toneFor(action: string): "green" | "amber" | "red" | "blue" | "neutral" {
  if (action.includes("APPROVED") || action.includes("ADJUSTED")) return "green";
  if (action.includes("REJECTED") || action.includes("DELETED") || action.includes("FAILED") || action.includes("DEACTIVATED")) return "red";
  if (action.includes("RETURNED") || action.includes("INVITED") || action.includes("SUBMITTED")) return "amber";
  if (action.includes("LOGIN") || action.includes("LOGOUT")) return "blue";
  return "neutral";
}
