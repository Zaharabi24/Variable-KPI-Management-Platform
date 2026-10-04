"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Bold, Check, Eye, Italic, Link2, Link2Off, List, ListOrdered, Paperclip, RemoveFormatting, Search, Send, Underline, Users, UsersRound, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import { Field, Input, FormAlert } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveMailAction } from "@/actions/mailbox";
import { cn, fmtBytes } from "@/lib/utils";
import {
  MAIL_AUDIENCE, MAIL_MAX_FILES, MAIL_MAX_TOTAL_BYTES, MAIL_SUBJECT_MAX, mailText, sanitizeMailHtml,
  type DraftRow, type MailAudience, type MailPerson,
} from "@/lib/mailbox";
import { MailBody, MailTemplate } from "./mail-view";

const TOOLS: { cmd: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { cmd: "bold", label: "Bold", icon: Bold },
  { cmd: "italic", label: "Italic", icon: Italic },
  { cmd: "underline", label: "Underline", icon: Underline },
  { cmd: "insertUnorderedList", label: "Bulleted list", icon: List },
  { cmd: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
];

export function Compose({ directory, draft, senderName, everyoneLabel }: { directory: MailPerson[]; draft: DraftRow | null; senderName: string; everyoneLabel: string }) {
  const toast = useToast();
  const router = useRouter();
  const [state, act, pending] = useActionState(saveMailAction, null);

  const [subject, setSubject] = React.useState(draft?.subject ?? "");
  const [html, setHtml] = React.useState(draft?.bodyHtml ?? "");
  const [audience, setAudience] = React.useState<MailAudience>(draft?.audience ?? MAIL_AUDIENCE.SELECTED);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(draft?.recipientIds.filter((id) => directory.some((p) => p.id === id)) ?? []));
  const [q, setQ] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [removed, setRemoved] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);
  const intentRef = React.useRef<HTMLInputElement>(null);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const rangeRef = React.useRef<Range | null>(null);
  const lastIntent = React.useRef<"draft" | "send">("draft");

  // The editor is uncontrolled (the browser owns the caret); seed it once with the saved draft.
  React.useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = draft?.bodyHtml ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keptAttachments = (draft?.attachments ?? []).filter((a) => !removed.includes(a.id));
  const attachmentCount = keptAttachments.length + files.length;
  const attachmentBytes = keptAttachments.reduce((a, f) => a + f.size, 0) + files.reduce((a, f) => a + f.size, 0);
  const filesError = attachmentCount > MAIL_MAX_FILES ? `Attach up to ${MAIL_MAX_FILES} files.` : attachmentBytes > MAIL_MAX_TOTAL_BYTES ? `Attachments must be ${fmtBytes(MAIL_MAX_TOTAL_BYTES)} or smaller in all.` : null;

  const recipients = audience === MAIL_AUDIENCE.ALL ? directory : directory.filter((p) => selected.has(p.id));
  const checks = { subject: subject.trim().length > 0, message: mailText(html).length > 0, recipients: recipients.length > 0 };
  const ready = checks.subject && checks.message && checks.recipients && !filesError;
  const e = state?.errors ?? {};

  const needle = q.trim().toLowerCase();
  const matches = (p: MailPerson) => !needle || [p.name, p.empCode, p.email, p.department ?? "", p.designation ?? ""].some((v) => v.toLowerCase().includes(needle));
  const visible = directory.filter(matches);

  React.useEffect(() => {
    if (!state) return;
    setConfirm(false);
    if (!state.ok) {
      toast("error", state.message ?? "Please check the message.");
      return;
    }
    toast("success", state.message ?? "Saved.");
    if (state.values?.sent) router.push("/mailbox?tab=sent");
    else if (state.values?.draftId) router.replace(`/mailbox?tab=compose&draft=${state.values.draftId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /** The hidden file input carries the chosen files with the form; keep it in step with the list on screen. */
  const syncFiles = (list: File[]) => {
    if (!fileRef.current) return;
    const dt = new DataTransfer();
    for (const f of list) dt.items.add(f);
    fileRef.current.files = dt.files;
  };
  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files];
    for (const f of Array.from(incoming)) if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    setFiles(next);
    syncFiles(next);
  };
  const removeFile = (i: number) => {
    const next = files.filter((_, j) => j !== i);
    setFiles(next);
    syncFiles(next);
  };

  const submit = (intent: "draft" | "send") => {
    lastIntent.current = intent;
    if (intentRef.current) intentRef.current.value = intent;
    syncFiles(files); // React resets file inputs after a server action
    formRef.current?.requestSubmit();
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    setHtml(editorRef.current?.innerHTML ?? "");
  };
  const openLink = () => {
    const sel = window.getSelection();
    rangeRef.current = sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    setLinkUrl("https://");
  };
  const applyLink = () => {
    const url = (linkUrl ?? "").trim();
    setLinkUrl(null);
    if (!/^(https?:\/\/|mailto:)\S+$/i.test(url) || url === "https://") return;
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (rangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(rangeRef.current);
    }
    // With nothing selected the address itself becomes the link text.
    const safe = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (!sel || sel.isCollapsed) document.execCommand("insertHTML", false, `<a href="${safe}">${safe}</a>`);
    else document.execCommand("createLink", false, url);
    setHtml(editorRef.current?.innerHTML ?? "");
  };

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const selectVisible = () => setSelected((s) => new Set([...s, ...visible.map((p) => p.id)]));

  const toolBtn = "h-8 w-8 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors";
  const previewName = recipients[0]?.name ?? "Employee Name";

  return (
    <form ref={formRef} action={act} noValidate onKeyDown={(ev) => { if (ev.key === "Enter" && ev.target instanceof HTMLInputElement) ev.preventDefault(); }} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <input type="hidden" name="draftId" value={draft?.id ?? ""} />
      <input ref={intentRef} type="hidden" name="intent" defaultValue="draft" />
      <input type="hidden" name="bodyHtml" value={html} />
      <input type="hidden" name="audience" value={audience} />
      <input type="hidden" name="recipientIds" value={JSON.stringify([...selected])} />
      <input type="hidden" name="removeAttachmentIds" value={JSON.stringify(removed)} />
      <input ref={fileRef} type="file" name="files" multiple className="hidden" tabIndex={-1} aria-hidden onChange={(ev) => ev.target.files && addFiles(ev.target.files)} />

      <div className="space-y-6 min-w-0">
        <Card>
          <CardHeader title="Message" subtitle={draft ? "Continuing a saved draft" : undefined} />
          <div className="px-5 pb-5 space-y-4">
            {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
            <Field label="Subject" htmlFor="mail-subject" required error={e.subject}>
              <Input id="mail-subject" name="subject" value={subject} onChange={(ev) => setSubject(ev.target.value)} invalid={!!e.subject} maxLength={MAIL_SUBJECT_MAX} placeholder="e.g. KPI submission for October closes on the 28th" />
            </Field>

            <div>
              <span className="label" id="mail-body-label">Message<span className="text-red-500 ml-0.5" aria-hidden>*</span></span>
              <div
                className={cn("rounded-[10px] border bg-white shadow-field transition-[border-color,box-shadow] focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/[0.12]", e.bodyHtml ? "border-red-400" : dragging ? "border-brand-500" : "border-ink-200")}
                onDragOver={(ev) => { ev.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(ev) => { ev.preventDefault(); setDragging(false); if (ev.dataTransfer.files.length) addFiles(ev.dataTransfer.files); }}
              >
                <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-ink-100" role="toolbar" aria-label="Formatting">
                  {TOOLS.map((t, i) => (
                    <React.Fragment key={t.cmd}>
                      {i === 3 && <span className="mx-1 h-5 w-px bg-ink-200" aria-hidden />}
                      <button type="button" className={toolBtn} title={t.label} aria-label={t.label} onMouseDown={(ev) => ev.preventDefault()} onClick={() => exec(t.cmd)}><t.icon className="h-4 w-4" /></button>
                    </React.Fragment>
                  ))}
                  <span className="mx-1 h-5 w-px bg-ink-200" aria-hidden />
                  <button type="button" className={toolBtn} title="Add link" aria-label="Add link" onMouseDown={(ev) => ev.preventDefault()} onClick={openLink}><Link2 className="h-4 w-4" /></button>
                  <button type="button" className={toolBtn} title="Remove link" aria-label="Remove link" onMouseDown={(ev) => ev.preventDefault()} onClick={() => exec("unlink")}><Link2Off className="h-4 w-4" /></button>
                  <button type="button" className={toolBtn} title="Clear formatting" aria-label="Clear formatting" onMouseDown={(ev) => ev.preventDefault()} onClick={() => exec("removeFormat")}><RemoveFormatting className="h-4 w-4" /></button>
                </div>
                {linkUrl !== null && (
                  <div className="flex items-center gap-2 px-2.5 py-2 border-b border-ink-100 bg-surface">
                    <Input aria-label="Link address" className="h-8 text-[13px]" value={linkUrl} autoFocus onChange={(ev) => setLinkUrl(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); applyLink(); } if (ev.key === "Escape") { ev.stopPropagation(); setLinkUrl(null); } }} placeholder="https://" />
                    <Button type="button" size="sm" onClick={applyLink}>Add link</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setLinkUrl(null)}>Cancel</Button>
                  </div>
                )}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-labelledby="mail-body-label"
                  aria-invalid={!!e.bodyHtml || undefined}
                  data-placeholder="Write your message here."
                  className="mail-body mail-editor min-h-[220px] max-h-[460px] overflow-y-auto scroll-thin px-3.5 py-3 text-[14px] leading-6 text-ink-900 focus:outline-none focus-visible:ring-0"
                  onInput={(ev) => setHtml(ev.currentTarget.innerHTML)}
                  onPaste={(ev) => { ev.preventDefault(); document.execCommand("insertText", false, ev.clipboardData.getData("text/plain")); }}
                />
              </div>
              {e.bodyHtml ? (
                <p className="mt-1.5 text-[12px] text-red-600" role="alert">{e.bodyHtml}</p>
              ) : (
                <p className="mt-1.5 text-[12px] text-ink-400">Format it like any email: bold, italic, underline, lists and links. Sent on the Anwar KPIFlow template, addressed to each person by name.</p>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" size="sm" icon={<Paperclip className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Attach files</Button>
                <span className="text-[12px] text-ink-400">Up to {MAIL_MAX_FILES} files, {fmtBytes(MAIL_MAX_TOTAL_BYTES)} in all. Every recipient gets them. You can also drop files on the message.</span>
              </div>
              {attachmentCount > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {keptAttachments.map((a) => (
                    <li key={a.id} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface pl-2.5 pr-1 h-8 text-[12.5px] text-ink-700">
                      <Paperclip className="h-3.5 w-3.5 text-ink-400" /> <span className="max-w-[200px] truncate">{a.fileName}</span> <span className="text-ink-400 tnum">{fmtBytes(a.size)}</span>
                      <button type="button" className="h-6 w-6 rounded-md flex items-center justify-center text-ink-400 hover:bg-ink-200 hover:text-ink-900" aria-label={`Remove ${a.fileName}`} onClick={() => setRemoved((r) => [...r, a.id])}><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                  {files.map((f, i) => (
                    <li key={`${f.name}-${f.size}`} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface pl-2.5 pr-1 h-8 text-[12.5px] text-ink-700">
                      <Paperclip className="h-3.5 w-3.5 text-ink-400" /> <span className="max-w-[200px] truncate">{f.name}</span> <span className="text-ink-400 tnum">{fmtBytes(f.size)}</span>
                      <button type="button" className="h-6 w-6 rounded-md flex items-center justify-center text-ink-400 hover:bg-ink-200 hover:text-ink-900" aria-label={`Remove ${f.name}`} onClick={() => removeFile(i)}><X className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
              {(filesError ?? e.files) && <p className="mt-2 text-[12px] text-red-600" role="alert">{filesError ?? e.files}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" icon={<Eye className="h-4 w-4" />} disabled={!checks.subject && !checks.message} onClick={() => setPreview(true)}>Preview</Button>
              <span className="text-[12px] text-ink-400">See it exactly as a recipient will before anything is sent.</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recipients" subtitle="Only people with an active account can be written to." />
          <div className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Who receives this message">
              {([
                { value: MAIL_AUDIENCE.SELECTED, title: "Selected employees", count: selected.size, hint: "Search the directory and pick who this goes to.", icon: UsersRound },
                { value: MAIL_AUDIENCE.ALL, title: "All employees", count: directory.length, hint: everyoneLabel, icon: Users },
              ] as const).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={audience === o.value}
                  onClick={() => setAudience(o.value)}
                  className={cn("text-left rounded-xl border px-4 py-3 transition-[border-color,box-shadow,background-color]", audience === o.value ? "border-brand-500 bg-brand-50/50 ring-4 ring-brand-500/[0.08]" : "border-ink-200 bg-white hover:border-ink-300")}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-[14px] font-semibold text-ink-900">{o.title}</span>
                    <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-500 tnum"><o.icon className="h-3.5 w-3.5" /> {o.count}</span>
                  </span>
                  <span className="block text-[12px] text-ink-500 mt-0.5">{o.hint}</span>
                </button>
              ))}
            </div>
            {e.recipients && <p className="mt-2 text-[12px] text-red-600" role="alert">{e.recipients}</p>}

            {audience === MAIL_AUDIENCE.ALL ? (
              <p className="mt-4 rounded-xl border border-ink-100 bg-surface px-4 py-3 text-[13px] text-ink-700">
                This message goes to all <strong className="font-semibold tnum">{directory.length}</strong> people in the list. Switch to Selected employees to pick individuals.
              </p>
            ) : directory.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-500">There is nobody with an active account to write to yet.</p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                    <Input type="search" aria-label="Search name, ID, email or department" placeholder="Search name, ID, email, department" className="pl-9 h-9" value={q} onChange={(ev) => setQ(ev.target.value)} />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-9" disabled={visible.length === 0} onClick={selectVisible}>Select all ({visible.length})</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-9" disabled={selected.size === 0} onClick={() => setSelected(new Set())}>Clear</Button>
                </div>
                <ul className="mt-3 max-h-[340px] overflow-y-auto scroll-thin rounded-xl border border-ink-100 divide-y divide-ink-100">
                  {visible.map((p) => (
                    <li key={p.id}>
                      <label className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-ink-100/40">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-ink-300 accent-[#DE3332]" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-ink-900 truncate">{p.name}</span>
                          <span className="block text-[12px] text-ink-500 truncate"><span className="font-mono">{p.empCode}</span> · {p.email}</span>
                        </span>
                        <span className="hidden sm:block text-right shrink-0 max-w-[45%]">
                          <span className="block text-[12.5px] text-ink-700 truncate">{p.department ?? "—"}</span>
                          <span className="block text-[12px] text-ink-400 truncate">{p.designation ?? "—"}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                  {visible.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-ink-500">Nobody matches this search.</li>}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-[88px]">
        <CardHeader title="Before you send" />
        <div className="px-5 pb-5">
          <div className="rounded-xl border border-ink-100 bg-surface py-4 text-center">
            <div className="text-[30px] font-semibold tnum leading-none tracking-[-0.02em] text-ink-900" aria-live="polite">{recipients.length}</div>
            <div className="mt-1.5 text-[12.5px] text-ink-500">recipient{recipients.length === 1 ? "" : "s"}</div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {([["Subject written", checks.subject], ["Message written", checks.message], ["Recipients chosen", checks.recipients]] as const).map(([label, done]) => (
              <li key={label} className={cn("flex items-center gap-2.5 text-[13px]", done ? "text-ink-900" : "text-ink-500")}>
                <span className={cn("h-[18px] w-[18px] rounded-full flex items-center justify-center shrink-0", done ? "bg-emerald-600 text-white" : "border border-ink-300 bg-white")} aria-hidden>{done && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                {label}<span className="sr-only">{done ? " — done" : " — not done yet"}</span>
              </li>
            ))}
          </ul>
          <Button type="button" className="w-full mt-5" icon={<Send className="h-4 w-4" />} disabled={!ready || pending} onClick={() => setConfirm(true)}>Send email</Button>
          <Button type="button" variant="outline" className="w-full mt-2" loading={pending && lastIntent.current === "draft"} disabled={pending || !!filesError || (!checks.subject && !checks.message)} onClick={() => submit("draft")}>Save as draft</Button>
          <p className="mt-3 text-[12px] text-ink-400">Nothing is sent until you confirm on the next step.</p>
        </div>
      </Card>

      {preview && (
        <Dialog open onClose={() => setPreview(false)} width="max-w-2xl" title="Preview" description={`How the email appears to each recipient. Shown here for ${previewName}.`}>
          <MailTemplate subject={subject.trim() || "(No subject)"} greetingName={previewName} senderName={senderName} attachments={[...keptAttachments.map((a) => ({ name: a.fileName, size: a.size })), ...files.map((f) => ({ name: f.name, size: f.size }))]}>
            <MailBody html={sanitizeMailHtml(html)} />
          </MailTemplate>
          <div className="flex justify-end mt-5"><Button type="button" variant="outline" onClick={() => setPreview(false)}>Close</Button></div>
        </Dialog>
      )}

      {confirm && (
        <Dialog open onClose={() => setConfirm(false)} title="Send this email?" description={`"${subject.trim()}" will be delivered to the Inbox of ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}${audience === MAIL_AUDIENCE.ALL ? " (All employees)" : ""}. A sent email cannot be recalled.`}>
          <div className="rounded-xl border border-ink-100 bg-surface px-4 py-3 mb-5 text-[13px] text-ink-700">
            <span className="text-ink-500">To: </span>
            {recipients.slice(0, 4).map((p) => p.name).join(", ")}
            {recipients.length > 4 && ` and ${recipients.length - 4} more`}
            {attachmentCount > 0 && <span className="block mt-1 text-ink-500">{attachmentCount} attachment{attachmentCount === 1 ? "" : "s"} · {fmtBytes(attachmentBytes)}</span>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirm(false)} disabled={pending}>Cancel</Button>
            <Button type="button" onClick={() => submit("send")} loading={pending} icon={<Send className="h-4 w-4" />}>Send email</Button>
          </div>
        </Dialog>
      )}
    </form>
  );
}
