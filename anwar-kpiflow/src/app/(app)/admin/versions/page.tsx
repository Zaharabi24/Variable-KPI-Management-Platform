import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, CardHeader, CardBody, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ROLES, MONTHS_SHORT } from "@/lib/constants";
import { VersionCompare } from "./version-compare";
import { KpiSearch } from "./kpi-search";
import { fmtDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Version Control and History" };

export default async function VersionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(ROLES.SUPER_ADMIN);
  const sp = await searchParams;
  const q = sp.q ?? "";

  const candidates = await db.kpi.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { owner: { fullName: { contains: q, mode: "insensitive" } } }, { owner: { employeeId: { contains: q, mode: "insensitive" } } }] } : {},
    include: { owner: true, _count: { select: { versions: true } } },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });
  const selectedId = sp.kpi ?? candidates[0]?.id ?? null;
  const kpi = selectedId
    ? await db.kpi.findUnique({ where: { id: selectedId }, include: { owner: true, approver: true, versions: { include: { changedBy: true }, orderBy: { versionNo: "asc" } } } })
    : null;

  return (
    <>
      <PageHeader title="Version Control and History" subtitle="Every change after submission is a new version. List, compare and inspect any KPI record; nothing is ever overwritten." />
      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <Card>
          <CardHeader title="KPI records" subtitle="Most recently changed first" />
          <div className="px-5 pb-3"><KpiSearch q={q} /></div>
          <ul className="max-h-[calc(100vh-320px)] overflow-y-auto scroll-thin border-t border-ink-100">
            {candidates.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-ink-500">No KPI matches.</li>}
            {candidates.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/versions?kpi=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`block px-5 py-3 border-b border-ink-100 hover:bg-surface ${c.id === selectedId ? "bg-brand-50/60 border-l-4 border-l-brand-600" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-medium text-ink-900 truncate">{c.name}</span>
                    <span className="text-[11px] text-ink-400 tnum shrink-0">{c._count.versions} v.</span>
                  </div>
                  <div className="text-[12px] text-ink-500 truncate">{c.owner.fullName} · {MONTHS_SHORT[c.periodMonth - 1]} {c.periodYear}{c.deletedAt ? " · deleted" : ""}</div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {kpi ? (
          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2">{kpi.name} <StatusBadge status={kpi.status} /></span>}
              subtitle={`${kpi.owner.fullName} · approver ${kpi.approver?.fullName ?? "—"} · ${kpi.versions.length} version${kpi.versions.length === 1 ? "" : "s"} · last change ${fmtDateTime(kpi.updatedAt)}`}
              action={<Link href={`/my-kpi/${kpi.id}`} className="text-[13px] font-medium text-brand-700 hover:underline">Open record →</Link>}
            />
            <CardBody>
              {kpi.deletedAt && <div className="mb-4 rounded-lg bg-ink-100/70 border border-ink-200 px-3 py-2 text-[13px]">Deleted {fmtDateTime(kpi.deletedAt)} · reason: {kpi.deleteReason}</div>}
              <VersionCompare versions={kpi.versions.map((v) => ({ id: v.id, versionNo: v.versionNo, action: v.action, snapshot: v.snapshot, changes: v.changes, reason: v.reason, createdAt: v.createdAt.toISOString(), changedBy: v.changedBy.fullName }))} />
            </CardBody>
          </Card>
        ) : (
          <Card><EmptyState icon={<History className="h-5 w-5" />} title="Select a KPI" description="Choose a KPI on the left to view and compare its versions." /></Card>
        )}
      </div>
    </>
  );
}
