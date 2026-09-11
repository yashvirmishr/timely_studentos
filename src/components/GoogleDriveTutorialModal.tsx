"use client";

import React from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface GoogleDriveTutorialModalProps {
  onClose: () => void;
}

export default function GoogleDriveTutorialModal({ onClose }: GoogleDriveTutorialModalProps) {
  const trapRef = useFocusTrap(true);

  return (
    <div className="modal-backdrop" ref={trapRef as React.RefObject<HTMLDivElement>} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ padding: 24, maxWidth: 560, overflow: "hidden" }}>
        <div className="modal-header">
          <div>
            <span className="section-kicker">Google Drive</span>
            <h2 style={{ fontSize: 20, fontFamily: "Kalam, cursive", margin: 0 }}>Get your OAuth Client ID</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <ol style={{ margin: "20px 0 0", padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 16, fontSize: 13.5, lineHeight: 1.6, overflowWrap: "break-word" as const }}>
          <li>
            <strong>Open Google Cloud Console</strong><br />
            Go to{" "}
            <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" style={{ color: "#4777aa", textDecoration: "underline", fontWeight: 600 }}>
              console.cloud.google.com ↗
            </a>{" "}
            and sign in with your Google account.
          </li>
          <li>
            <strong>Create or select a project</strong><br />
            Use the project dropdown at the top to create a new project (e.g. "Timely Drive") or select an existing one.
          </li>
          <li>
            <strong>Enable the Google Drive API</strong><br />
            Navigate to{" "}
            <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener" style={{ color: "#4777aa", textDecoration: "underline", fontWeight: 600 }}>
              APIs &amp; Services → Library ↗
            </a>
            , search for <em>Google Drive API</em>, and click <strong>Enable</strong>.
          </li>
          <li>
            <strong>Create OAuth 2.0 credentials</strong><br />
            Go to{" "}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style={{ color: "#4777aa", textDecoration: "underline", fontWeight: 600 }}>
              APIs &amp; Services → Credentials ↗
            </a>
            , click <strong>Create Credentials → OAuth client ID</strong>. If prompted, configure the OAuth consent screen first (External user type is fine; fill in app name, save, skip scopes for now).
          </li>
          <li>
            <strong>Configure the OAuth client</strong><br />
            Choose <strong>Web application</strong> as the application type. Under <strong>Authorized JavaScript origins</strong>, add:
            <div style={{ margin: "8px 0", padding: "8px 12px", background: "#1e2023", borderRadius: 6, fontFamily: "DM Mono, monospace", fontSize: 12.5, color: "#e8e6e1", border: "1px solid #333" }}>
              http://localhost:3000
            </div>
            If you host Timely on a different URL, add that too.
          </li>
          <li>
            <strong>Copy the Client ID</strong><br />
            After creation, you'll see a Client ID string ending in <code style={{ background: "#1e2023", color: "#e8e6e1", padding: "1px 4px", borderRadius: 3 }}>.apps.googleusercontent.com</code>. Copy it and paste it into the input field on this page.
          </li>
        </ol>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button className="primary-button" onClick={onClose}>
            <span className="material-symbols-outlined">check</span> Got it
          </button>
        </div>
      </div>
    </div>
  );
}
