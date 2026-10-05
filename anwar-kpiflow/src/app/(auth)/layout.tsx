import Link from "next/link";
import { Logo } from "@/components/shell/logo";

/** Vercel: allow slow database round trips and cold starts to finish instead of cutting the response (default is 10 s on Hobby). */
export const maxDuration = 60;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="hidden lg:flex flex-col justify-between bg-brand-500 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800" aria-hidden />
        <div className="absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-black/10 blur-3xl" aria-hidden />
        <div className="relative"><Logo variant="dark" size="lg" /></div>
        <div className="relative max-w-md">
          <p className="text-[12px] uppercase tracking-[0.16em] text-white/90 mb-4">Variable KPI · Phase 01</p>
          <h2 className="text-[34px] leading-[1.15] font-semibold tracking-tight">
            Every score traceable from submission to audit.
          </h2>
          <p className="mt-4 text-[15px] text-white/90 leading-7">
            One guided flow across all Anwar Group business units, with the status shown live at every step.
            Employee → Department Head → HR Admin → Finance Admin → Audit Admin.
          </p>
          <ol className="mt-8 grid grid-cols-3 gap-2 text-[12px]">
            {["Submit", "Department Head", "HR Admin", "Finance Admin", "Audit Admin"].map((s, i) => (
              <li key={s} className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-3 py-2 whitespace-nowrap">
                <span className="h-5 w-5 rounded-full bg-white text-brand-600 flex items-center justify-center text-[11px] font-bold">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <p className="relative text-[12px] text-white/90">© {new Date().getFullYear()} Anwar Group of Industries · Anwar KPIFlow prototype</p>
      </aside>
      <main className="flex flex-col bg-white">
        <div className="lg:hidden px-6 pt-6">
          <Link href="/login" className="inline-block"><Logo /></Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[440px] animate-fade-up">{children}</div>
        </div>
      </main>
    </div>
  );
}
