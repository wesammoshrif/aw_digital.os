"use client";

/**
 * Globale Error-Boundary (fängt Fehler im Root-Layout). Muss eigenes
 * <html>/<body> rendern. Generische Meldung, keine Detail-Leaks.
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] Globaler Fehler:", error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0c0c0d",
          color: "#e8e8e8",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Etwas ist schiefgelaufen</h1>
          <p style={{ marginTop: 8, color: "#9a9a9a", fontSize: 13 }}>
            Bitte erneut versuchen.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              borderRadius: 6,
              border: "none",
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
              background: "#c87d4a",
              color: "#0c0c0d",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
