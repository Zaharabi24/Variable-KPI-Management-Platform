import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check your email" };

export default async function SentPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
        <MailCheck className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-[24px] font-semibold tracking-tight text-ink-900">Check your inbox</h1>
      <p className="mt-2 text-[14px] text-ink-500">
        We sent an account setup email to <span className="font-medium text-ink-900">{email ?? "your company address"}</span>. Open the secure link to set your password. The link is single-use and expires in 48 hours.
      </p>
      <div className="mt-7 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-4 text-left">
        <p className="text-[12.5px] text-brand-900">
          <span className="font-semibold">Prototype note:</span> emails are delivered to an in-app Outbox instead of a mail server.
        </p>
        <Link href="/dev/outbox" className="inline-block mt-3">
          <Button size="sm" variant="secondary">Open the Outbox</Button>
        </Link>
      </div>
      <p className="mt-6 text-[13px] text-ink-500">
        <Link href="/login" className="text-brand-700 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
