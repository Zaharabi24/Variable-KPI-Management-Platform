import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { EVIDENCE_ALLOWED_TYPES, EVIDENCE_MAX_BYTES } from "./constants";

/**
 * Evidence storage (Section 17.3, NFR-07, NFR-13).
 * File bytes are kept in the database next to their SHA-256 fingerprint, so the app runs unchanged
 * on hosts with ephemeral disks (Vercel). Downloads always go through the access guard in
 * app/api/evidence/[id]. Swap `data` for an object-store key (e.g. Vercel Blob) if files grow large.
 */

export type StoredFile = {
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  sha256: string;
  data: Uint8Array<ArrayBuffer>;
};

export function validateEvidence(file: File): string | null {
  if (!file || file.size === 0) return "Evidence file is required.";
  if (file.size > EVIDENCE_MAX_BYTES) return "Evidence file must be 4 MB or smaller.";
  const type = file.type || "application/octet-stream";
  if (!EVIDENCE_ALLOWED_TYPES.includes(type)) {
    return "Allowed evidence types: PDF, PNG, JPG, Excel, Word, CSV or text.";
  }
  return null;
}

export async function storeEvidence(file: File): Promise<StoredFile> {
  const buf = Buffer.from(await file.arrayBuffer());
  return storeBuffer(file.name, file.type || "application/octet-stream", buf);
}

/** Also used by the seed: fingerprint and package a buffer for the EvidenceFile row. */
export async function storeBuffer(fileName: string, mimeType: string, buf: Buffer): Promise<StoredFile> {
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const ext = path.extname(fileName).slice(0, 10);
  return { fileName, storedName: `${randomUUID()}${ext}`, mimeType, size: buf.length, sha256, data: Uint8Array.from(buf) };
}
