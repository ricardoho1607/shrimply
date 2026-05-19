"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px",
      background: "var(--bg-dark)",
      color: "var(--text-primary)",
      fontFamily: "var(--sans)",
    }}>
      <section style={{
        width: "100%",
        maxWidth: "520px",
        padding: "40px",
        borderRadius: "24px",
        background: "#fff",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        textAlign: "center",
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "20px",
          background: "rgba(239, 68, 68, 0.08)",
          color: "#dc2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <AlertTriangle size={30} />
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 850, marginBottom: "12px", fontFamily: "var(--jakarta)" }}>
          Something went wrong
        </h1>
        <p style={{ color: "var(--text-muted)", fontWeight: 600, lineHeight: 1.7, marginBottom: "28px" }}>
          The page hit an unexpected error. You can try again without losing your place.
        </p>
        {error.digest && (
          <p style={{ color: "var(--text-faint)", fontSize: "12px", fontWeight: 700, marginBottom: "20px" }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="btn-primary"
          style={{
            borderRadius: "14px",
            padding: "14px 24px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <RotateCcw size={18} />
          Try Again
        </button>
      </section>
    </main>
  );
}
