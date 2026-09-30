"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/field";

export function KpiSearch({ q }: { q: string }) {
  const router = useRouter();
  return (
    <form className="relative" onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("q") as string) ?? ""; router.push(`/admin/versions${v ? `?q=${encodeURIComponent(v)}` : ""}`); }}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
      <Input name="q" defaultValue={q} placeholder="Find KPI, owner or Employee ID" className="pl-9" aria-label="Find KPI" />
    </form>
  );
}
