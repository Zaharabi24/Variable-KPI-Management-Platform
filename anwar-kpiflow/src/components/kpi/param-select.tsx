"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/field";

/** A filter that lives in the URL: choosing an option sets (or clears) one query parameter and keeps the others. */
export function ParamSelect({ param, label, value, options, allLabel, className = "h-9 w-[200px]" }: { param: string; label: string; value: string; options: { id: string; name: string }[]; allLabel: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <Select
      aria-label={label}
      className={className}
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(sp.toString());
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        const s = next.toString();
        router.push(s ? `${pathname}?${s}` : pathname);
      }}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </Select>
  );
}
