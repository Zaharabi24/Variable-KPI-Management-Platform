import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader, Card, CardHeader, CardBody } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/utils";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const stats = await db.kpi.groupBy({ by: ["status"], where: { ownerId: user.id, deletedAt: null }, _count: { _all: true } });
  const count = (s: string) => stats.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="Profile" subtitle="Your sign-up details. Company Email, Employee ID, Business Unit and Department are maintained by the Super Admin." />
      <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
        <Card className="p-6 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-brand-700 text-white text-[26px] font-semibold flex items-center justify-center">{initials(user.fullName)}</div>
          <h2 className="mt-4 text-[18px] font-semibold text-ink-900">{user.fullName}</h2>
          <p className="text-[13px] text-ink-500">{user.designation ?? ROLE_LABELS[user.role]}</p>
          <span className="inline-flex mt-3 h-6 px-2.5 rounded-full bg-brand-50 text-brand-800 border border-brand-100 text-[11.5px] font-medium">{ROLE_LABELS[user.role]}</span>
          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface border border-ink-100 p-3"><dt className="text-[11px] text-ink-400">Submitted</dt><dd className="font-mono tnum text-[18px] font-semibold">{count("SUBMITTED")}</dd></div>
            <div className="rounded-xl bg-surface border border-ink-100 p-3"><dt className="text-[11px] text-ink-400">Approved</dt><dd className="font-mono tnum text-[18px] font-semibold text-brand-700">{count("APPROVED") + count("ADJUSTED")}</dd></div>
            <div className="rounded-xl bg-surface border border-ink-100 p-3"><dt className="text-[11px] text-ink-400">Returned</dt><dd className="font-mono tnum text-[18px] font-semibold text-red-600">{count("RETURNED")}</dd></div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Account details" subtitle="Add or edit your Corporate Phone Number and designation." />
          <CardBody>
            <ProfileForm
              user={{
                fullName: user.fullName, email: user.email, employeeId: user.employeeId,
                businessUnit: user.businessUnit?.name ?? "—", department: user.department?.name ?? (user.role === "SUPER_ADMIN" ? "All departments" : "—"),
                corporatePhone: user.corporatePhone, designation: user.designation,
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
