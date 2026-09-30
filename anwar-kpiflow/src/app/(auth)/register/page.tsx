import type { Metadata } from "next";
import { db } from "@/lib/db";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [units, departments] = await Promise.all([
    db.businessUnit.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <RegisterForm units={units} departments={departments} />;
}
