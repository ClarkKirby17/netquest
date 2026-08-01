"use client";

/* Replaces the whole document when even the root layout fails, so it
   cannot rely on any of the app's styling. */
export default function GlobalError({
  error,
  reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#070d16",
          color: "#e8f4ff",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 24 }}
      >
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>NetQuest is down</h1>
          <p style={{ color: "#8fa7c4", fontSize: 14, lineHeight: 1.6 }}>
            Something failed at the very top level. Reloading usually clears it.
          </p>
          {error.digest && (
            <p style={{ color: "#5c718f", fontSize: 11, marginTop: 12 }}>
              reference {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24, background: "#00f5a0", color: "#070d16",
              border: 0, borderRadius: 8, padding: "10px 20px",
              fontWeight: 600, cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
