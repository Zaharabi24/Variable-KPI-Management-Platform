import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canViewKpi } from "@/lib/auth";
import { readEvidence } from "@/lib/storage";
import { audit } from "@/lib/audit";

/** NFR-07 — evidence downloads go through the access guard; every download is audited. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await db.evidenceFile.findUnique({ where: { id }, include: { kpi: { include: { owner: true } } } });
  if (!file || !canViewKpi(user, file.kpi)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buf = await readEvidence(file.storedName);
    await audit(user.id, "EVIDENCE_DOWNLOADED", "EvidenceFile", file.id, { kpiId: file.kpiId, fileName: file.fileName });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(buf.length),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
        "X-Content-SHA256": file.sha256,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing from storage" }, { status: 410 });
  }
}
