"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/field";

export function DepartmentPicker({ departments, value, allLabel = "All departments" }: { departments: { id: string; name: string }[]; value: string; allLabel?: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <Select
      aria-label="Department"
      className="h-9 w-[200px]"
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(sp.toString());
        if (e.target.value) next.set("dept", e.target.value);
        else next.delete("dept");
        router.push(`${pathname}?${next.toString()}`);
      }}
    >
      {allLabel !== null && <option value="">{allLabel}</option>}
      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </Select>
  );
}
