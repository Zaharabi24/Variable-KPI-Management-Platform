import type { Metadata } from "next";
import { ROLES } from "@/lib/constants";
import { StageAdminsPage } from "./stage-admins";

export const metadata: Metadata = { title: "Finance Admin" };

export default function FinanceAdminsPage() {
  return <StageAdminsPage role={ROLES.FINANCE_ADMIN} />;
}
