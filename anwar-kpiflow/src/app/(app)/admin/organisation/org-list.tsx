"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, FormAlert } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { addBusinessUnitAction, addDepartmentAction, renameOrgAction, deleteOrgAction } from "@/actions/admin";

type Item = { id: string; name: string; code: string; users: number };

export function OrgList({ kind, title, subtitle, items }: { kind: "businessUnit" | "department"; title: string; subtitle: string; items: Item[] }) {
  const [state, action, pending] = useActionState(kind === "department" ? addDepartmentAction : addBusinessUnitAction, null);
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [busy, start] = React.useTransition();
  const toast = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) { toast("success", state.message ?? "Added."); setAdding(false); formRef.current?.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={<Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding((a) => !a)}>Add</Button>} />
      {adding && (
        <form ref={formRef} action={action} className="px-5 pb-4 flex flex-col sm:flex-row gap-2" noValidate>
          <Input name="name" defaultValue={state?.values?.name} placeholder="Name" aria-label="Name" className="flex-1" autoFocus />
          <Input name="code" defaultValue={state?.values?.code} placeholder="CODE" aria-label="Code" className="sm:w-28 font-mono uppercase" maxLength={8} />
          <Button type="submit" loading={pending}>Save</Button>
        </form>
      )}
      {state?.errors?.name && <div className="px-5 pb-3"><FormAlert kind="error">{state.errors.name}</FormAlert></div>}
      <ul className="border-t border-ink-100">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 px-5 py-3 border-b border-ink-100 last:border-0">
            {editing === it.id ? (
              <form
                className="flex-1 flex gap-2"
                onSubmit={(e) => { e.preventDefault(); const name = (new FormData(e.currentTarget).get("name") as string) ?? ""; start(async () => { await renameOrgAction(kind, it.id, name); setEditing(null); toast("success", "Renamed."); }); }}
              >
                <Input name="name" defaultValue={it.name} className="flex-1 h-9" autoFocus aria-label="New name" />
                <Button type="submit" size="sm" loading={busy} icon={<Check className="h-4 w-4" />}>Save</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)} icon={<X className="h-4 w-4" />}>Cancel</Button>
              </form>
            ) : (
              <>
                <span className="font-mono text-[11.5px] text-ink-500 bg-ink-100/70 rounded px-1.5 py-0.5 w-16 text-center">{it.code}</span>
                <span className="flex-1 text-[14px] text-ink-900">{it.name}</span>
                <span className="text-[12px] text-ink-400 tnum">{it.users} user{it.users === 1 ? "" : "s"}</span>
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 hover:text-ink-900" onClick={() => setEditing(it.id)} aria-label={`Rename ${it.name}`}><Pencil className="h-4 w-4" /></button>
                <button
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                  disabled={it.users > 0}
                  title={it.users > 0 ? "Move its users first" : "Delete"}
                  onClick={() => start(async () => { const r = await deleteOrgAction(kind, it.id); toast(r?.ok ? "success" : "error", r?.ok ? "Deleted." : (r?.message ?? "Could not delete.")); })}
                  aria-label={`Delete ${it.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
