"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Anwar KPIFlow hit an unexpected error</h1>
      <p style={{ color: "#5d6b64", marginTop: 8 }}>Please try again. {error.digest ? `Reference ${error.digest}.` : ""}</p>
      <button onClick={reset} style={{ marginTop: 20, background: "#DE3332", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}>Try again</button>
    </div>
  );
}
