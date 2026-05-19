import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px",
      background: "var(--off-white)",
      color: "var(--ink)",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: "560px" }}>
        <div className="eyebrow" style={{ marginBottom: "18px" }}>404</div>
        <h1 style={{ marginBottom: "24px" }}>Page not found.</h1>
        <p style={{ marginBottom: "36px", color: "var(--muted)", fontWeight: 500 }}>
          The page you are looking for does not exist or may have moved.
        </p>
        <Link href="/" className="btn-primary">Return Home</Link>
      </div>
    </main>
  );
}
