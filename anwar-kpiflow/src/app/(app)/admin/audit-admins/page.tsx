import type { Metadata } from "next";
import { ROLES } from "@/lib/constants";
import { StageAdminsPage } from "../finance-admins/stage-admins";

export const metadata: Metadata = { title: "Audit Admin" };

export default function AuditAdminsPage() {
  return <StageAdminsPage role={ROLES.AUDIT_ADMIN} />;
}
