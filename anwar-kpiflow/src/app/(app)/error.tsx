"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Friendly recovery screen for unexpected server errors (e.g. a database hiccup); keeps the shell around it. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card p-10 max-w-xl mx-auto text-center mt-10">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center"><AlertTriangle className="h-6 w-6" /></div>
      <h1 className="mt-4 text-[20px] font-semibold text-ink-900">Something went wrong loading this screen</h1>
      <p className="mt-1.5 text-[14px] text-ink-500">Your data is safe. Try again, or go back to your home screen. If it keeps happening, contact the Super Admin.</p>
      {error.digest && <p className="mt-3 font-mono text-[11px] text-ink-400">ref {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>Try again</Button>
        <Link href="/"><Button variant="outline">Home</Button></Link>
      </div>
    </div>
  );
}
