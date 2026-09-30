import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { EVIDENCE_ALLOWED_TYPES, EVIDENCE_MAX_BYTES } from "./constants";

const ROOT = path.join(process.cwd(), "storage", "evidence");

export type StoredFile = {
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  sha256: string;
};

export function validateEvidence(file: File): string | null {
  if (!file || file.size === 0) return "Evidence file is required.";
  if (file.size > EVIDENCE_MAX_BYTES) return "Evidence file must be 10 MB or smaller.";
  const type = file.type || "application/octet-stream";
  if (!EVIDENCE_ALLOWED_TYPES.includes(type)) {
    return "Allowed evidence types: PDF, PNG, JPG, Excel, Word, CSV or text.";
  }
  return null;
}

/** Store evidence outside the database with a content fingerprint (NFR-13, Section 17.3). */
export async function storeEvidence(file: File): Promise<StoredFile> {
  await mkdir(ROOT, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const ext = path.extname(file.name).slice(0, 10);
  const storedName = `${randomUUID()}${ext}`;
  await writeFile(path.join(ROOT, storedName), buf);
  return { fileName: file.name, storedName, mimeType: file.type || "application/octet-stream", size: buf.length, sha256 };
}

export async function readEvidence(storedName: string): Promise<Buffer> {
  const safe = path.basename(storedName);
  return readFile(path.join(ROOT, safe));
}

/** Seed helper: write a generated file with a real hash. */
export async function storeBuffer(fileName: string, mimeType: string, buf: Buffer): Promise<StoredFile> {
  await mkdir(ROOT, { recursive: true });
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const ext = path.extname(fileName);
  const storedName = `${randomUUID()}${ext}`;
  await writeFile(path.join(ROOT, storedName), buf);
  return { fileName, storedName, mimeType, size: buf.length, sha256 };
}
