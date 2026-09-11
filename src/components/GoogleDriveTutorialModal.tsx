"use client";

import React from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

export type GoogleServiceType = "calendar" | "classroom" | "drive";

interface GoogleServiceTutorialModalProps {
  type: GoogleServiceType;
  onClose: () => void;
}

const SERVICE_CONFIG: Record<GoogleServiceType, {
  label: string;
  apiName: string;
  apiLibraryUrl: string;
  apiEnableUrl: string;
  projectHint: string;
  scopeNote: string;
}> = {
  calendar: {
    label: "Google Calendar",
    apiName: "Google Calendar API",
    apiLibraryUrl: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
    apiEnableUrl: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
    projectHint: "Timely Calendar",
    scopeNote: "Read-only access to import your events into the Schedule view.",
  },
  classroom: {
    label: "Google Classroom",
    apiName: "Google Classroom API",
    api LibraryUrl: "https://console.cloud.google.com/apis/library/classroom.googleapis.com",
    apiEnableUrl: "https://console.cloud.google.com/apis/library/classroom.googleapis.com",
    projectHint: "Timely Classroom",
    scopeNote: "Read-only access to import assignments and coursework.",
  },
  drive: {
    label: "Google Drive",
    apiName: "Google Drive API",
    api LibraryUrl: "https://console.cloud.google.com/apis/library/drive.googleapis.com",
    apiEnableUrl: "https://console.cloud.google.com/apis/library/drive.googleapis.com",
    projectHint: "Timely Drive",
    scopeNote: "Access only files created by Timely (drive.file scope).",
  },
};

export default function GoogleServiceTutorialModal({ type, onClose }: GoogleServiceTutorialModalProps) {
  const trapRef = useFocusTrap(true);
  const config = SERVICE_CONFIG[type];

  return (
    <div className="modal-backdrop" ref={trapRef as React.RefObject<HTMLDivElement>} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ padding: 24, maxWidth: 560, overflow: "hidden" }}>
        <div className="modal-header">
          <div>
            <span className="section-kicker">{config.label}</span>
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
            Use the project dropdown at the top to create a new project (e.g. &ldquo;{config.projectHint}&rdquo;) or select an existing one.
          </li>
          <li>
            <strong>Enable the {config.apiName}</strong><br />
            Navigate to{" "}
            <a href={config.apiEnableUrl} target="_blank" rel="noopener" style={{ color: "#4777aa", textDecoration: "underline", fontWeight: 600 }}>
              APIs &amp; Services → Library ↗
            </a>
            , search for <em>{config.apiName}</em>, and click <strong>Enable</strong>.
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
            After creation, you&apos;ll see a Client ID string ending in <code style={{ background: "#1e2023", color: "#e8e6e1", padding: "1px 4px", borderRadius: 3 }}>.apps.googleusercontent.com</code>. Copy it and paste it into the input field on this page.
          </li>
        </ol>

        <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(71,119,170,.08)", borderRadius: 6, fontSize: 12.5, color: "#4777aa", lineHeight: 1.5 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4 }}>info</span>
          {config.scopeNote}
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button className="primary-button" onClick={onClose}>
            <span className="material-symbols-outlined">check</span> Got it
          </button>
        </div>
      </div>
    </div>
  );
}
