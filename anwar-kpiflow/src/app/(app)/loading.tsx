/** Section 15.11 — skeleton loader while a screen's data loads. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-7 w-56 rounded-lg bg-ink-100 mb-2" />
      <div className="h-4 w-80 rounded bg-ink-100 mb-6" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 h-[152px]">
            <div className="h-3 w-28 rounded bg-ink-100" />
            <div className="h-7 w-20 rounded bg-ink-100 mt-4" />
            <div className="h-3 w-36 rounded bg-ink-100 mt-3" />
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className="h-4 w-40 rounded bg-ink-100 mb-5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-ink-100/70 mb-2" />
        ))}
      </div>
    </div>
  );
}
