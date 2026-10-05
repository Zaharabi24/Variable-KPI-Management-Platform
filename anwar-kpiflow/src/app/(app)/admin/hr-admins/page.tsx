import type { Metadata } from "next";
import { ROLES } from "@/lib/constants";
import { StageAdminsPage } from "../finance-admins/stage-admins";

export const metadata: Metadata = { title: "HR Admin" };

export default function HrAdminsPage() {
  return <StageAdminsPage role={ROLES.HR_ADMIN} />;
}
