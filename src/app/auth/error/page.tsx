"use client";

import React from "react";
import Link from "next/link";

/**
 * Landing page for failed auth callbacks (bad/expired magic link, OAuth
 * error). The callback route redirects here instead of leaving the user on a
 * 404. Offers a way back to login with the error preserved in the URL.
 */
export default function AuthErrorPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="paper-card"
        style={{
          maxWidth: 420,
          width: "100%",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          textAlign: "center",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#c0392b" }}>
          error
        </span>
        <h1 style={{ fontSize: 22, margin: 0, fontFamily: "Kalam, cursive" }}>
          Sign-in didn&apos;t complete
        </h1>
        <p style={{ color: "#777871", fontSize: 14, margin: 0 }}>
          The sign-in link was invalid or has expired. Magic links only work
          once — request a fresh one and try again.
        </p>
        <Link
          href="/login"
          className="primary-button"
          style={{ justifyContent: "center", textDecoration: "none" }}
        >
          <span className="material-symbols-outlined">arrow_back</span> Back to login
        </Link>
      </div>
    </div>
  );
}
