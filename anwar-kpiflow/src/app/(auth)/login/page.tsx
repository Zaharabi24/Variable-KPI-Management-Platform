import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { DEMO_ACCOUNTS } from "@/lib/demo";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const sp = await searchParams;
  return <LoginForm setupDone={sp.setup === "done"} demo={DEMO_ACCOUNTS} />;
}
