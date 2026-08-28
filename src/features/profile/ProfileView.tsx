"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Task, AiConfig, Preferences } from "@/lib/types";
import { checkAiConnection, listAvailableModels } from "@/lib/local-ai";
import { connectGoogleClassroom, disconnectGoogle, fetchAssignments, getGoogleConfig } from "@/lib/google-classroom";
import { connectGoogleCalendar, disconnectGoogleCalendar, getGoogleCalendarConfig } from "@/lib/google-calendar";

interface ProfileViewProps {
  aiConfig: AiConfig;
  onAiConfigChange: (updates: Partial<AiConfig>) => void;
  aiOnline: boolean;
  onTaskImport?: (tasks: Task[]) => void;
  onToast?: (msg: string) => void;
  preferences: Preferences;
  setPreferences: (prefs: Partial<Preferences>) => void;
}

const PREFERENCE_ITEMS = [
  { icon: "notifications", label: "Notifications", desc: "Manage notification settings" },
  { icon: "palette", label: "Appearance", desc: "Theme, colors, and display" },
  { icon: "lock", label: "Privacy & data", desc: "Data storage and privacy controls" },
  { icon: "help", label: "Help center", desc: "Documentation and support" },
];

export default function ProfileView({
  aiConfig,
  onAiConfigChange,
  aiOnline,
  onTaskImport,
  onToast,
  preferences,
  setPreferences,
}: ProfileViewProps) {
  // Google Classroom state
  const [gcConnected, setGcConnected] = useState(false);
  const [gcEmail, setGcEmail] = useState("");
  const [gcClientId, setGcClientId] = useState("");
  const [gcBusy, setGcBusy] = useState(false);
  const [gcError, setGcError] = useState<string | null>(null);
  const [gcSynced, setGcSynced] = useState<string | null>(null);
  const [calendarClientId, setCalendarClientId] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Local AI test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Mainstream text-only Gemini models (updated August 2026)
  const FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ];

  // Load saved GC client ID
  useEffect(() => {
    try {
      const saved = localStorage.getItem("timely_gc_client_id");
      if (saved) setGcClientId(saved);
      const config = getGoogleConfig();
      setGcConnected(config.connected);
      setGcEmail(config.email || "");
      const calendar = getGoogleCalendarConfig();
      setCalendarClientId(calendar.clientId);
      setCalendarConnected(calendar.connected);
    } catch {}
  }, []);

  const handleGcClientIdChange = (id: string) => {
    setGcClientId(id);
    try { localStorage.setItem("timely_gc_client_id", id); } catch {}
  };

  const handleGcConnect = useCallback(async () => {
    if (!gcClientId) return;
    setGcBusy(true);
    setGcError(null);
    try {
      await connectGoogleClassroom(gcClientId.trim());
      const config = getGoogleConfig();
      setGcConnected(config.connected);
      setGcEmail(config.email || "");
      onToast?.("Connected to Google Classroom");
    } catch (error: any) {
      setGcError(error?.message || "Connection failed. Check your Client ID and OAuth settings.");
    } finally {
      setGcBusy(false);
    }
  }, [gcClientId, onToast]);

  const handleGcDisconnect = useCallback(() => {
    disconnectGoogle();
    setGcConnected(false);
    setGcEmail("");
    setGcSynced(null);
    onToast?.("Disconnected from Google Classroom");
  }, [onToast]);

  const handleGcSync = useCallback(async () => {
    if (!gcConnected) return;
    setGcBusy(true);
    setGcSynced(null);
    setGcError(null);

    try {
      const assignments = await fetchAssignments();
      const classroomTasks: Task[] = assignments.map(assignment => ({
        id: `classroom-${assignment.id}`,
        title: assignment.title,
        subject: assignment.courseName || "Google Classroom",
        due: assignment.dueDate || "unscheduled",
        time: "30 min",
        priority: "medium",
        completed: false,
        custom: true,
        notes: assignment.description,
      }));
      onTaskImport?.(classroomTasks);
      setGcSynced(`${classroomTasks.length} assignments synced from Classroom`);
    } catch (error: any) {
      setGcError(error?.message || "Classroom sync failed. Please reconnect and try again.");
    } finally {
      setGcBusy(false);
    }
  }, [gcConnected, onTaskImport]);

  // Filter to only text chat models (exclude image, tts, robotics, music, etc.)
  const filterTextModels = (models: string[]) => {
    const EXCLUDE = /image|tts|robotics|lyria|nano-banana|omni|computer-use|deep-research|antigravity|music/;
    return models.filter(m => !EXCLUDE.test(m));
  };

  // Auto-fetch models when API key is entered
  useEffect(() => {
    if (aiConfig.apiKey && aiConfig.enabled && availableModels.length === 0) {
      setModelsLoading(true);
      listAvailableModels(aiConfig.apiKey).then(models => {
        const filtered = filterTextModels(models);
        if (filtered.length) setAvailableModels(filtered);
        setModelsLoading(false);
      });
    }
  }, [aiConfig.apiKey, aiConfig.enabled]);

  const handleTestAi = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await checkAiConnection();
      if (result.models?.length) setAvailableModels(filterTextModels(result.models));
      setTestResult(result.ok ? `Connected to Gemini — ${result.models?.join(", ") || aiConfig.model}` : `Not reachable: ${result.error || "unknown"}`);
    } catch (e: any) {
      setTestResult(e?.message || "Connection failed. Check API key.");
    }
    setTesting(false);
  }, [aiConfig.model]);

  const dotColor = (active: boolean) => active ? "#4caf50" : "#aaa";

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Make Timely yours</p>
          <h1>Your <span className="yellow-underline">profile</span></h1>
          <p className="heading-subtitle">Preferences, connections, and a few nice things.</p>
        </div>
      </div>
      <div className="profile-settings-grid">
        {/* Avatar card */}
        <div className="settings-card paper-card profile-large">
          <div className="large-avatar avatar">{preferences.profileName.slice(0, 2).toUpperCase()}</div>
          <h2>{preferences.profileName}</h2>
          <p className="profile-subtitle">Student</p>            <button className="text-button" onClick={() => document.getElementById("profileName")?.focus()}>Edit profile <span className="material-symbols-outlined">edit</span></button>
          <div className="profile-divider" />
          <div className="term-row"><span>Current term</span><strong>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} <span className="material-symbols-outlined">expand_more</span></strong></div>
        </div>

        {/* Calendars */}
        <div className="settings-card paper-card">
          <span className="section-kicker">Connected calendars</span>
          <h3>Everything in sync</h3>
          <div className="connection-row">
            <span className="connection-logo google">G</span>
            <div><strong>Google Calendar</strong><small>{calendarConnected ? "Connected · ready to sync" : "Connect to import events into Schedule"}</small></div>
            {calendarConnected ? <button className="text-button" onClick={() => { disconnectGoogleCalendar(); setCalendarConnected(false); }}>Disconnect</button> : <span className="material-symbols-outlined status-icon-inactive">link_off</span>}
          </div>
          {!calendarConnected && <div className="field-row" style={{marginTop: 8}}>
            <input className="text-field" value={calendarClientId} onChange={e => setCalendarClientId(e.target.value)} placeholder="Google OAuth Client ID" />
            <button className="primary-button" disabled={!calendarClientId.trim() || calendarBusy} onClick={async () => { setCalendarBusy(true); setCalendarError(null); try { await connectGoogleCalendar(calendarClientId); setCalendarConnected(true); onToast?.("Google Calendar connected"); } catch (e: any) { setCalendarError(e?.message || "Calendar connection failed"); } finally { setCalendarBusy(false); } }}>{calendarBusy ? "Connecting..." : "Connect"}</button>
          </div>}
          {calendarError && <small className="status-msg status-error">{calendarError}</small>}
          <div className="connection-row">
            <span className="connection-logo outlook">O</span>
            <div><strong>Outlook</strong><small>Not connected</small></div>
            <button className="text-button">Connect</button>
          </div>            <div className="settings-link"><span>Calendar integrations</span><span>{calendarConnected ? "Ready to sync" : "Not connected"}</span></div>
        </div>

        {/* Google Classroom */}
        <div className="settings-card paper-card">
          <span className="section-kicker">Google Classroom</span>
          <div style={{display: "flex", alignItems: "center", gap: 8}}>
            <span className="status-dot" style={{background: dotColor(gcConnected)}} />
            <span className="status-label">
              {gcConnected ? `Connected as ${gcEmail || "Google"}` : "Not connected"}
            </span>
          </div>
          <div style={{marginTop: 8}}>
            <label className="field-label">Google Cloud Client ID</label>
            <div className="field-row">
              <input
                type="text"
                className="text-field"
                value={gcClientId}
                onChange={e => handleGcClientIdChange(e.target.value)}
                placeholder="Paste your OAuth 2.0 Client ID"
                disabled={gcConnected}
              />
              {!gcConnected ? (
                <button className="primary-button" onClick={handleGcConnect} disabled={!gcClientId || gcBusy}>
                  <span className="material-symbols-outlined">login</span> Connect Google Classroom
                </button>
              ) : (
                <div style={{display: "flex", gap: 8}}>
                  <button className="text-button" onClick={handleGcSync} disabled={gcBusy}>
                    <span className="material-symbols-outlined">sync</span> {gcBusy ? "Syncing..." : "Sync assignments"}
                  </button>
                  <button className="text-button danger" onClick={handleGcDisconnect}>
                    <span className="material-symbols-outlined">link_off</span> Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
          {gcError && <small className="status-msg status-error">{gcError}</small>}
          {gcSynced && <small className="status-msg status-success">{gcSynced}</small>}
          <p className="hint-text">
            Create a project at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a>,
            enable the Classroom API, and create an OAuth 2.0 Client ID for a Web application.
            Add <code>http://localhost:3002</code> to Authorized JavaScript origins.
          </p>
        </div>

        {/* Gemini API */}
        <div className="settings-card paper-card">
          <span className="section-kicker">Study Chat AI · Gemini</span>
          <div style={{display: "flex", alignItems: "center", gap: 8}}>
            <span className="status-dot" style={{background: dotColor(aiOnline)}} />
            <span className="status-label">
              {aiOnline ? `Connected · ${aiConfig.model}` : aiConfig.apiKey ? "Key saved · test to verify" : "Not connected"}
            </span>
          </div>
          <label className="check-row" style={{marginTop: 8}}>
            <input type="checkbox" checked={aiConfig.enabled} onChange={e => onAiConfigChange({ enabled: e.target.checked })} />
            <span className="fake-checkbox"><span className="material-symbols-outlined">check</span></span>
            Enable Gemini
          </label>
          {aiConfig.enabled && (
            <>
              <div style={{marginTop: 10}}>
                <label className="field-label">Gemini API key</label>
                <input
                  type="password"
                  className="text-field"
                  value={aiConfig.apiKey}
                  onChange={e => onAiConfigChange({ apiKey: e.target.value })}
                  placeholder="Paste key from aistudio.google.com"
                  autoComplete="off"
                />
              </div>
              <div style={{marginTop: 8}}>
                <label className="field-label">Model</label>
                <select className="text-field" value={aiConfig.model} onChange={e => onAiConfigChange({ model: e.target.value })}>
                  {modelsLoading && <option>Loading models...</option>}
                  {(availableModels.length ? availableModels : FALLBACK_MODELS).map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                  {!availableModels.includes(aiConfig.model) && !FALLBACK_MODELS.includes(aiConfig.model) && (
                    <option value={aiConfig.model}>{aiConfig.model} (current)</option>
                  )}
                </select>
                <small className="hint-text">
                  {availableModels.length > 0
                    ? `${availableModels.length} models loaded from your API key.`
                    : modelsLoading
                    ? "Loading available models..."
                    : "Enter your API key to auto-load available models."
                  }
                </small>
              </div>
              <button className="text-button" onClick={handleTestAi} disabled={testing || !aiConfig.apiKey} style={{marginTop: 10}}>
                <span className="material-symbols-outlined">{testing ? "hourglass_top" : "network_ping"}</span>
                {testing ? "Testing..." : "Test Gemini key"}
              </button>
              {testResult && (
                <small className={`status-msg ${testResult.startsWith("Connected") ? "status-success" : "status-error"}`}>
                  {testResult}
                </small>
              )}
            </>
          )}
          <p className="hint-text">
            Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">aistudio.google.com</a>.
            Key is stored locally in your browser only. Billing: <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener">ai.google.dev/pricing</a>.
          </p>
        </div>

        {/* Preferences */}
        <div className="settings-card paper-card">
          <span className="section-kicker">Preferences</span>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="check-row">
              <input type="checkbox" checked={preferences.notifications} onChange={e => setPreferences({ notifications: e.target.checked })} />
              <span className="fake-checkbox"><span className="material-symbols-outlined">check</span></span>
              Enable notifications
            </label>
            <label className="check-row">
              <input type="checkbox" checked={preferences.reduceMotion} onChange={e => setPreferences({ reduceMotion: e.target.checked })} />
              <span className="fake-checkbox"><span className="material-symbols-outlined">check</span></span>
              Reduce motion
            </label>
            <div style={{ marginTop: 8 }}>
              <label className="field-label">Theme</label>
              <select className="text-field" value={preferences.theme} onChange={e => setPreferences({ theme: e.target.value as any })}>
                <option value="paper">Paper (light)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <label className="field-label">Your name</label>
              <input
                type="text"
                className="text-field"
                value={preferences.profileName}
                onChange={e => setPreferences({ profileName: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            {PREFERENCE_ITEMS.map((p, i) => (
              <button key={i} className="settings-link" style={{ justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined">{p.icon}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.label}</div>
                    <small style={{ color: "#777871" }}>{p.desc}</small>
                  </div>
                </span>
                <span>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}