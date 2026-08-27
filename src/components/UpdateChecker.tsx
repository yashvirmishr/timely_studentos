"use client";

import { useState, useEffect, useCallback } from "react";

interface UpdateInfo {
  version: string;
  body?: string;
  date?: string;
}

export default function UpdateChecker() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const checkForUpdates = useCallback(async () => {
    if (!isTauri) return;
    setChecking(true);
    setError(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const result = await check();
      if (result) {
        setUpdate({
          version: result.version,
          body: result.body,
          date: result.date,
        });
      }
    } catch (e: any) {
      setError(e?.message || "Update check failed");
    }
    setChecking(false);
  }, [isTauri]);

  const installUpdate = useCallback(async () => {
    if (!isTauri || !update) return;
    setDownloading(true);
    setError(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      const result = await check();
      if (result) {
        let total = 0;
        let downloaded = 0;
        await result.downloadAndInstall((event: any) => {
          switch (event.event) {
            case "Started":
              total = event.data.contentLength || 0;
              break;
            case "Progress":
              downloaded += event.data.chunkLength || 0;
              if (total > 0) setProgress(Math.round((downloaded / total) * 100));
              break;
            case "Finished":
              setProgress(100);
              break;
          }
        });
        await relaunch();
      }
    } catch (e: any) {
      setError(e?.message || "Update install failed");
    }
    setDownloading(false);
  }, [isTauri, update]);

  // Auto-check once on mount (desktop only)
  useEffect(() => {
    if (isTauri) checkForUpdates();
  }, [isTauri, checkForUpdates]);

  if (!isTauri || (!update && !checking && !error)) return null;

  return (
    <div className="update-banner">
      {checking && (
        <span className="update-status">
          <span className="material-symbols-outlined" style={{fontSize: 16}}>sync</span>
          Checking for updates…
        </span>
      )}

      {error && (
        <span className="update-status" style={{color: "var(--red)"}}>
          <span className="material-symbols-outlined" style={{fontSize: 16}}>error</span>
          {error}
        </span>
      )}

      {update && !downloading && (
        <>
          <span className="update-status">
            <span className="material-symbols-outlined" style={{fontSize: 16}}>system_update</span>
            <strong>Timely {update.version}</strong> is available
            {update.body && <span className="update-notes"> — {update.body.slice(0, 80)}</span>}
          </span>
          <button className="text-button" onClick={installUpdate}>
            Update now
          </button>
        </>
      )}

      {downloading && (
        <span className="update-status">
          <span className="material-symbols-outlined" style={{fontSize: 16}}>download</span>
          Downloading update{progress > 0 ? ` (${progress}%)` : "…"}
        </span>
      )}
    </div>
  );
}
