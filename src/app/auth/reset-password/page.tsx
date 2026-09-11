"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/lib/supabase/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // The reset link contains a code that Supabase exchanges for a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        setStatus("idle");
      } else {
        setErrorMsg("Invalid or expired reset link. Please request a new one.");
        setStatus("error");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    const { error } = await updatePassword(password);
    if (error) {
      setStatus("error");
      setErrorMsg(error.message || "Failed to update password.");
    } else {
      setStatus("done");
    }
  }

  return (
    <div className="login-shell login-page-enter">
      <div className="login-card login-card-enter">
        <div className="login-tack">
          <div className="login-tack-head" />
          <div className="login-tack-needle" />
          <div className="login-tack-shadow" />
        </div>

        <h1 className="login-title">Timely</h1>
        <p className="login-subtitle">
          {status === "done" ? "Your password has been updated." : "Set a new password for your account."}
        </p>

        {status === "done" ? (
          <div className="login-success">
            <div className="login-success-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#2e7d32" }}>check_circle</span>
            </div>
            <h2>Password updated</h2>
            <p>You can now sign in with your new password.</p>
            <button
              className="login-submit"
              onClick={() => router.replace("/login")}
              style={{ marginTop: 12 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
              Sign In
            </button>
          </div>
        ) : !sessionReady ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite", fontSize: 32, color: "#aaa79e" }}>
              progress_activity
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="login-label">New Password</label>
            <div className="login-input-row">
              <span className="material-symbols-outlined">lock</span>
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoFocus
              />
            </div>

            <label className="login-label" style={{ marginTop: 16 }}>Confirm Password</label>
            <div className="login-input-row">
              <span className="material-symbols-outlined">lock</span>
              <input
                className="login-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="login-error">Passwords don&apos;t match.</p>
            )}

            {status === "error" && errorMsg && (
              <p className="login-error">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={status === "loading" || !password.trim() || !confirmPassword.trim() || password !== confirmPassword}
            >
              {status === "loading" ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, animation: "spin 1s linear infinite" }}>progress_activity</span>
                  Updating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check</span>
                  Update Password
                </>
              )}
            </button>
          </form>
        )}

        <svg className="login-scribble" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 100 100">
          <path d="M10,90 Q30,10 50,50 T90,10" />
          <path d="M20,80 Q50,20 80,80" />
        </svg>
      </div>
    </div>
  );
}
