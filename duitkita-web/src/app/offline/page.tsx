export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #0f0520 0%, #1a0533 50%, #2d0b5e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "15%",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,43,226,0.25), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "15%",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,30,140,0.18), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(139,43,226,0.18)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 32px rgba(139,43,226,0.35)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      {/* Text */}
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "rgba(255,255,255,0.95)",
          marginBottom: "8px",
          position: "relative",
          zIndex: 1,
        }}
      >
        Kamu sedang offline
      </h1>
      <p
        style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.45)",
          maxWidth: "280px",
          lineHeight: 1.6,
          position: "relative",
          zIndex: 1,
        }}
      >
        Periksa koneksi internetmu dan coba lagi.
      </p>

      {/* Button — native <a> agar bekerja tanpa JS hydration saat offline */}
      <a
        href="/"
        style={{
          marginTop: "32px",
          padding: "12px 32px",
          background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)",
          color: "white",
          fontWeight: 600,
          fontSize: "15px",
          borderRadius: "12px",
          textDecoration: "none",
          display: "inline-block",
          boxShadow: "0 4px 20px rgba(139,43,226,0.45)",
          position: "relative",
          zIndex: 1,
        }}
      >
        Coba lagi
      </a>

      {/* App label */}
      <p
        style={{
          marginTop: "48px",
          fontSize: "11px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.2)",
          position: "relative",
          zIndex: 1,
        }}
      >
        DuitKita
      </p>
    </div>
  );
}
