import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/card";
import { ROLES } from "@/lib/constants";
import { OrgList } from "./org-list";

export const metadata: Metadata = { title: "Units and Departments" };

export default async function OrganisationPage() {
  await requireRole(ROLES.SUPER_ADMIN);
  const [units, departments] = await Promise.all([
    db.businessUnit.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
    db.department.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Units and Departments" subtitle="Reference lists used at sign-up and invitation. Maintained here, not by developers." />
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <OrgList kind="businessUnit" title="Business Units" subtitle="All ten Anwar Group business units" items={units.map((u) => ({ id: u.id, name: u.name, code: u.code, users: u._count.users }))} />
        <OrgList kind="department" title="Departments" subtitle="Every employee and Department Head belongs to one" items={departments.map((d) => ({ id: d.id, name: d.name, code: d.code, users: d._count.users }))} />
      </div>
    </>
  );
}
