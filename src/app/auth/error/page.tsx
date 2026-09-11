"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "An error occurred during authentication.";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: '"DM Sans", sans-serif',
        background: "#fdfbf6",
        color: "#243034",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <span
          style={{
            font: "700 32px Kalam, cursive",
            color: "#c53b40",
            display: "block",
            marginBottom: 12,
          }}
        >
          Oops
        </span>
        <p style={{ fontSize: 14, color: "#6c8385", lineHeight: 1.5, margin: "0 0 24px" }}>
          {message}
        </p>
        <a
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            background: "#334347",
            color: "#fff",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "background 0.2s",
          }}
        >
          Back to login
        </a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
