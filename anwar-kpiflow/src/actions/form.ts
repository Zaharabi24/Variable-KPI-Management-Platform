import type { z } from "zod";

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Submitted values echoed back on validation failure, so uncontrolled fields keep what the user typed (React 19 resets forms after an action). */
  values?: Record<string, string>;
} | null;

export function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const SECRET = /password|confirm|token/i;

export function valuesOf(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !SECRET.test(k) && !k.startsWith("$")) out[k] = v;
  }
  return out;
}

export function invalid(formData: FormData, errors: Record<string, string>, message?: string): ActionState {
  return { ok: false, errors, values: valuesOf(formData), message };
}
