import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SetupPasswordForm } from "./setup-form";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export const metadata: Metadata = { title: "Set your password" };

export default async function SetupPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = token ? await db.accountToken.findUnique({ where: { token }, include: { user: { include: { department: true } } } }) : null;
  const invalid = !t || !!t.usedAt || t.expiresAt < new Date();

  if (invalid) {
    return (
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink-900">This link is no longer valid</h1>
        <p className="mt-2 text-[14px] text-ink-500">
          Setup links are single-use and expire after 48 hours. Request a new link with your company email.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/forgot-password"><Button>Request a new link</Button></Link>
          <Link href="/login"><Button variant="outline">Back to sign in</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <SetupPasswordForm
      token={t.token}
      type={t.type}
      user={{ fullName: t.user.fullName, email: t.user.email, role: ROLE_LABELS[t.user.role as Role], department: t.user.department?.name ?? null }}
    />
  );
}
