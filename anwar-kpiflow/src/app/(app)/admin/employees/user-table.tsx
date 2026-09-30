"use client";

import * as React from "react";
import { useActionState } from "react";
import { MoreHorizontal, Send, ArrowRightLeft, UserX, UserCheck, Trash2, Pencil } from "lucide-react";
import { Table, Th, Td } from "@/components/ui/table";
import { Pill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/modal";
import { Field, Input, Select, FormAlert } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { resendInvitationAction, moveUserAction, setUserStatusAction, deleteUserAction, editUserAction } from "@/actions/admin";
import { fmtDate } from "@/lib/utils";

export type UserRow = {
  id: string; fullName: string; email: string; employeeId: string; designation: string | null; status: string;
  businessUnit: string; businessUnitId: string | null; department: string; departmentId: string | null;
  invitation: { expiresAt: string; usedAt: string | null } | null; pending: number; corporatePhone: string | null;
};
type Opt = { id: string; name: string };

export function UserTable({ users, units, departments, kind }: { users: UserRow[]; units: Opt[]; departments: Opt[]; kind: "head" | "employee" }) {
  const [menu, setMenu] = React.useState<string | null>(null);
  const [move, setMove] = React.useState<UserRow | null>(null);
  const [edit, setEdit] = React.useState<UserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<UserRow | null>(null);
  const toast = useToast();
  const [busy, start] = React.useTransition();

  React.useEffect(() => {
    const h = () => setMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const invitationState = (u: UserRow) => {
    if (u.status === "DEACTIVATED") return <Pill tone="red">Deactivated</Pill>;
    if (u.status === "ACTIVE") return <Pill tone="green">Active</Pill>;
    if (u.invitation && new Date(u.invitation.expiresAt) < new Date()) return <Pill tone="red">Invitation expired</Pill>;
    return <Pill tone="amber">Invitation pending</Pill>;
  };

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Name</Th><Th>Employee ID</Th><Th>Business Unit</Th><Th>Department</Th><Th>Status</Th><Th align="right">{kind === "head" ? "Pending reviews" : "KPIs"}</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr><Td className="text-center text-ink-500 py-10" >No users match.</Td><Td /><Td /><Td /><Td /><Td /><Td /></tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-surface/70">
              <Td><div className="font-medium">{u.fullName}</div><div className="text-[12px] text-ink-400">{u.email}{u.designation ? ` · ${u.designation}` : ""}</div></Td>
              <Td mono>{u.employeeId}</Td>
              <Td>{u.businessUnit}</Td>
              <Td>{u.department}</Td>
              <Td>
                {invitationState(u)}
                {u.status === "PENDING_SETUP" && u.invitation && <div className="text-[11px] text-ink-400 mt-1">link valid until {fmtDate(u.invitation.expiresAt)}</div>}
              </Td>
              <Td align="right" mono>{u.pending}</Td>
              <Td align="right">
                <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                  <button className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-100" onClick={() => setMenu(menu === u.id ? null : u.id)} aria-label="Actions" aria-haspopup="menu">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menu === u.id && (
                    <div role="menu" className="absolute right-0 z-20 mt-1 w-56 card p-1.5 shadow-pop text-left animate-fade-up">
                      <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { setEdit(u); setMenu(null); }}>Edit details</MenuItem>
                      {u.status === "PENDING_SETUP" && (
                        <MenuItem icon={<Send className="h-4 w-4" />} onClick={() => start(async () => { await resendInvitationAction(u.id); toast("success", `Link resent to ${u.email}. See the Outbox.`); setMenu(null); })}>Resend setup link</MenuItem>
                      )}
                      <MenuItem icon={<ArrowRightLeft className="h-4 w-4" />} onClick={() => { setMove(u); setMenu(null); }}>Move department / unit</MenuItem>
                      {u.status === "ACTIVE" && (
                        <MenuItem icon={<UserX className="h-4 w-4" />} onClick={() => start(async () => { await setUserStatusAction(u.id, "DEACTIVATED"); toast("success", `${u.fullName} deactivated.`); setMenu(null); })}>Deactivate</MenuItem>
                      )}
                      {u.status === "DEACTIVATED" && (
                        <MenuItem icon={<UserCheck className="h-4 w-4" />} onClick={() => start(async () => { await setUserStatusAction(u.id, "ACTIVE"); toast("success", `${u.fullName} reactivated.`); setMenu(null); })}>Reactivate</MenuItem>
                      )}
                      <MenuItem icon={<Trash2 className="h-4 w-4" />} danger onClick={() => { setConfirmDelete(u); setMenu(null); }}>Remove</MenuItem>
                    </div>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {move && <MoveDialog user={move} units={units} departments={departments} onClose={() => setMove(null)} />}
      {edit && <EditDialog user={edit} onClose={() => setEdit(null)} />}
      {confirmDelete && (
        <Dialog open onClose={() => setConfirmDelete(null)} title={`Remove ${confirmDelete.fullName}?`} description="If this user owns or approves any KPI, the account is deactivated instead so history stays intact. Otherwise the account is deleted.">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={() => start(async () => { await deleteUserAction(confirmDelete.id); toast("success", `${confirmDelete.fullName} removed.`); setConfirmDelete(null); })}>Remove</Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] ${danger ? "text-red-700 hover:bg-red-50" : "text-ink-700 hover:bg-ink-100"}`}>
      <span className={danger ? "text-red-500" : "text-ink-400"}>{icon}</span>{children}
    </button>
  );
}

function MoveDialog({ user, units, departments, onClose }: { user: UserRow; units: Opt[]; departments: Opt[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(moveUserAction, null);
  const toast = useToast();
  React.useEffect(() => { if (state?.ok) { toast("success", state.message ?? "Moved."); onClose(); } }, [state, toast, onClose]);
  return (
    <Dialog open onClose={onClose} title={`Move ${user.fullName}`} description="Submitted KPIs stay with the department that received them; new KPIs go to the new department's heads.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="userId" value={user.id} />
        {state?.message && !state.ok && <FormAlert kind="error">{state.message}</FormAlert>}
        <Field label="Business Unit" htmlFor="mv-bu"><Select id="mv-bu" name="businessUnitId" defaultValue={user.businessUnitId ?? ""}>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Department" htmlFor="mv-dept"><Select id="mv-dept" name="departmentId" defaultValue={user.departmentId ?? ""}>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={pending}>Move</Button></div>
      </form>
    </Dialog>
  );
}

function EditDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [state, action, pending] = useActionState(editUserAction, null);
  const toast = useToast();
  React.useEffect(() => { if (state?.ok) { toast("success", state.message ?? "Saved."); onClose(); } }, [state, toast, onClose]);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};
  return (
    <Dialog open onClose={onClose} title={`Edit ${user.fullName}`} description={user.email}>
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="userId" value={user.id} />
        <Field label="Full Name" htmlFor="eu-name" required error={e.fullName}><Input id="eu-name" name="fullName" defaultValue={v.fullName ?? user.fullName} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee ID" htmlFor="eu-eid" required error={e.employeeId}><Input id="eu-eid" name="employeeId" defaultValue={v.employeeId ?? user.employeeId} className="font-mono" /></Field>
          <Field label="Designation" htmlFor="eu-des"><Input id="eu-des" name="designation" defaultValue={v.designation ?? user.designation ?? ""} /></Field>
        </div>
        <Field label="Corporate Phone" htmlFor="eu-phone"><Input id="eu-phone" name="corporatePhone" defaultValue={v.corporatePhone ?? user.corporatePhone ?? ""} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={pending}>Save</Button></div>
      </form>
    </Dialog>
  );
}
