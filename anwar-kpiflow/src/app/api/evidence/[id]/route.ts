import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canViewKpi } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** NFR-07 — evidence downloads go through the access guard; every download is audited. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await db.evidenceFile.findUnique({ where: { id }, include: { kpi: { include: { owner: true } } } });
  if (!file || !canViewKpi(user, file.kpi)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit(user.id, "EVIDENCE_DOWNLOADED", "EvidenceFile", file.id, { kpiId: file.kpiId, fileName: file.fileName });
  const body = new Uint8Array(file.data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
      "X-Content-SHA256": file.sha256,
      "Cache-Control": "private, no-store",
    },
  });
}
