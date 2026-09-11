"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithGoogle } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const persisted = localStorage.getItem("timely_remember_me");
    if (persisted !== null) {
      setRememberMe(persisted === "1");
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace("/");
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  function storeRememberPreference() {
    if (rememberMe) {
      localStorage.setItem("timely_remember_me", "1");
      sessionStorage.removeItem("timely_remember_me");
    } else {
      localStorage.removeItem("timely_remember_me");
      sessionStorage.setItem("timely_remember_me", "1");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMsg("");
    storeRememberPreference();

    const { error } = await signInWithEmail(email.trim());

    if (error) {
      setStatus("error");
      setErrorMsg(error.message || "Failed to send magic link. Please try again.");
    } else {
      setStatus("sent");
    }
  }

  async function handleGoogleSignIn() {
    setErrorMsg("");
    storeRememberPreference();
    const { error } = await signInWithGoogle();
    if (error) {
      setStatus("error");
      setErrorMsg(error.message || "Google sign-in failed. Please try again.");
    }
  }

  if (checkingSession) {
    return (
      <div className="login-shell">
        <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite", fontSize: 32, color: "#aaa79e" }}>
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="login-shell login-page-enter">
      {/* Background doodles */}
      <svg className="login-doodle login-doodle--pencil" viewBox="0 0 120 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="30" y="4" width="70" height="16" rx="1" fill="rgba(255,220,100,.3)" stroke="currentColor"/>
        <polygon points="100,4 115,12 100,20" fill="rgba(255,180,80,.4)" stroke="currentColor"/>
        <line x1="30" y1="4" x2="100" y2="4" strokeDasharray="2 3"/>
        <line x1="42" y1="8" x2="56" y2="8" strokeWidth="1"/>
        <line x1="42" y1="12" x2="64" y2="12" strokeWidth="1"/>
        <line x1="42" y1="16" x2="52" y2="16" strokeWidth="1"/>
      </svg>
      <svg className="login-doodle login-doodle--ruler" viewBox="0 0 160 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="152" height="16" rx="1" fill="rgba(180,210,180,.25)" stroke="currentColor"/>
        <line x1="20" y1="4" x2="20" y2="12"/><line x1="36" y1="4" x2="36" y2="10"/>
        <line x1="52" y1="4" x2="52" y2="12"/><line x1="68" y1="4" x2="68" y2="10"/>
        <line x1="84" y1="4" x2="84" y2="12"/><line x1="100" y1="4" x2="100" y2="10"/>
        <line x1="116" y1="4" x2="116" y2="12"/><line x1="132" y1="4" x2="132" y2="10"/>
        <line x1="148" y1="4" x2="148" y2="12"/>
        <text x="18" y="20" fontSize="5" fill="currentColor" stroke="none">cm</text>
      </svg>
      <svg className="login-doodle login-doodle--star" viewBox="0 0 48 48" fill="rgba(255,210,80,.5)" stroke="currentColor" strokeWidth="1.5">
        <polygon points="24,4 29,18 44,18 32,27 36,42 24,33 12,42 16,27 4,18 19,18"/>
      </svg>
      <svg className="login-doodle login-doodle--heart" viewBox="0 0 40 40" fill="rgba(200,80,80,.35)" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 36 C10 26 2 20 2 12 A8 8 0 0 1 20 10 A8 8 0 0 1 38 12 C38 20 30 26 20 36Z"/>
      </svg>

      <div className="login-card login-card-enter">
        {/* Pushpin */}
        <div className="login-tack">
          <div className="login-tack-head" />
          <div className="login-tack-needle" />
          <div className="login-tack-shadow" />
        </div>

        {/* Title */}
        <h1 className="login-title">Timely</h1>
        <p className="login-subtitle">
          Your academic operating system.<br />
          Sign in to pick up where you left off.
        </p>

        {status === "sent" ? (
          <div className="login-success">
            <div className="login-success-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#2e7d32" }}>mark_email_read</span>
            </div>
            <h2>Check your inbox</h2>
            <p>
              We sent a magic link to <strong>{email}</strong>.<br />
              Click the link in the email to sign in.
            </p>
            <button
              className="text-button"
              onClick={() => { setStatus("idle"); setEmail(""); }}
              style={{ fontSize: 14 }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="login-google-btn" onClick={handleGoogleSignIn}>
              <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">or sketch with</span>
              <div className="login-divider-line" />
            </div>

            <form onSubmit={handleSubmit}>
              <label className="login-label">Email Address</label>
              <div className="login-input-row">
                <span className="material-symbols-outlined">mail</span>
                <input
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                  autoFocus
                />
              </div>

              {status === "error" && (
                <p className="login-error">{errorMsg}</p>
              )}

              <div className="login-check-row">
                <label className="login-check-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={status === "sending" || !email.trim()}
              >
                {status === "sending" ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, animation: "spin 1s linear infinite" }}>progress_activity</span>
                    Sending…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>mail</span>
                    Sign In
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <svg className="login-scribble" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 100 100">
          <path d="M10,90 Q30,10 50,50 T90,10" />
          <path d="M20,80 Q50,20 80,80" />
        </svg>
      </div>

      <p className="login-footer" style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center" }}>
        No password needed — we&apos;ll email you a sign-in link.
      </p>
    </div>
  );
}
