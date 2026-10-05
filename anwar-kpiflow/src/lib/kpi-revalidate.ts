import { revalidatePath } from "next/cache";

/** Every screen that shows KPI data, plus the layout (sidebar badge). Called after each workflow step. */
export function revalidateKpi(kpiId?: string) {
  for (const p of ["/my-kpi", "/kpi-requests", "/dashboard", "/performance", "/leaderboard", "/admin/kpis", "/admin/versions"]) revalidatePath(p);
  if (kpiId) revalidatePath(`/my-kpi/${kpiId}`);
  revalidatePath("/", "layout");
}
