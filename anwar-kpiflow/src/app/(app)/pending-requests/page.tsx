import { redirect } from "next/navigation";

/** The request queue for every reviewing role now lives at /kpi-requests; old links keep working. */
export default async function PendingRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  redirect(sp.open ? `/kpi-requests?open=${encodeURIComponent(sp.open)}` : "/kpi-requests");
}
