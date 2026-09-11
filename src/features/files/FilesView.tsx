"use client";

import React, { useState, useRef, useCallback } from "react";
import type { FileItem } from "@/lib/types";
import {
  listDriveFiles,
  uploadFile as driveUploadFile,
  deleteDriveFile,
  downloadFile as driveDownloadFile,
  getDownloadUrl,
  disconnectGoogleDrive,
  connectGoogleDrive,
  getGoogleDriveConfig,
  getDriveStorageQuota,
} from "@/lib/google-drive";
import type { DriveFileInfo } from "@/lib/google-drive";
import GoogleDriveTutorialModal from "@/components/GoogleDriveTutorialModal";

interface FilesViewProps {
  files: FileItem[];
  onAddFile: (file: FileItem) => void;
  onDeleteFile: (id: string) => void;
  onUpdateFile: (id: string, updates: Partial<FileItem>) => void;
  subjects: { name: string }[];
  onToast?: (msg: string) => void;
}

function getFileType(name: string): "pdf" | "doc" | "img" {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext || "")) return "doc";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) return "img";
  return "doc";
}

const MB = 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDriveDate(iso: string): string {    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


export default function FilesView({ files, onAddFile, onDeleteFile, onUpdateFile, subjects, onToast }: FilesViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Drive state
  const [driveConnected, setDriveConnected] = useState(() => getGoogleDriveConfig().connected);
  const [driveClientId, setDriveClientId] = useState(() => getGoogleDriveConfig().clientId);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [driveStorage, setDriveStorage] = useState<{ limit: number; usage: number } | null>(null);
  const [showDriveTutorial, setShowDriveTutorial] = useState(false);

  // Real Drive quota — fetched from the API once connected. If the quota call
  // fails the bar simply stays hidden rather than showing a made-up value.
  React.useEffect(() => {
    if (!driveConnected) {
      setDriveStorage(null);
      return;
    }
    let cancelled = false;
    getDriveStorageQuota()
      .then((quota) => {
        if (!cancelled && quota.limit > 0) setDriveStorage(quota);
      })
      .catch(() => {
        if (!cancelled) setDriveStorage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [driveConnected]);

  const handleDriveConnect = useCallback(async () => {
    if (!driveClientId.trim()) return;
    setDriveBusy(true);
    setDriveError(null);
    try {
      await connectGoogleDrive(driveClientId.trim());
      setDriveConnected(true);
      onToast?.("Connected to Google Drive");
    } catch (e: any) {
      setDriveError(e?.message || "Drive connection failed");
    } finally {
      setDriveBusy(false);
    }
  }, [driveClientId, onToast]);

  const handleDriveDisconnect = useCallback(() => {
    disconnectGoogleDrive();
    setDriveConnected(false);
    onToast?.("Disconnected from Google Drive");
  }, [onToast]);

  const handleFileSelect = useCallback(async (file: File) => {
    const type = getFileType(file.name);

    if (driveConnected) {
      // Upload to Drive
      setUploading(file.name);
      setUploadPercent(0);
      setDriveError(null);
      try {
        const driveFile = await driveUploadFile(file, setUploadPercent);
        const newFile: FileItem = {
          id: `file-${Date.now()}`,
          name: file.name,
          type,
          subject: "Unsorted",
          updated: formatDriveDate(driveFile.modifiedTime),
          size: formatFileSize(driveFile.size),
          driveFileId: driveFile.id,
        };
        onAddFile(newFile);
        onToast?.(`Uploaded "${file.name}" to Drive`);
      } catch (e: any) {
        setDriveError(e?.message || "Upload failed");
      } finally {
        setUploading(null);
        setUploadPercent(0);
      }
    } else {
      // Store locally
      const newFile: FileItem = {
        id: `file-${Date.now()}`,
        name: file.name,
        type,
        subject: "Unsorted",
        updated: formatDate(new Date()),
        size: formatFileSize(file.size),
      };
      onAddFile(newFile);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [driveConnected, onAddFile, onToast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDelete = useCallback(async (file: FileItem) => {
    if (file.driveFileId && driveConnected) {
      try {
        await deleteDriveFile(file.driveFileId);
        onToast?.(`Deleted "${file.name}" from Drive`);
      } catch (e: any) {
        setDriveError(e?.message || "Delete from Drive failed");
        return; // Don't remove from store if Drive delete failed
      }
    }
    onDeleteFile(file.id);
  }, [driveConnected, onDeleteFile, onToast]);

  const handleDownload = useCallback(async (file: FileItem) => {
    if (file.driveFileId && driveConnected) {
      try {
        const blob = await driveDownloadFile(file.driveFileId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e: any) {
        setDriveError(e?.message || "Download failed");
      }
    } else if (!file.driveFileId) {
      onToast?.("This file is stored locally only");
    }
  }, [driveConnected, onToast]);

  const handleSyncFromDrive = useCallback(async () => {
    if (!driveConnected) return;
    setDriveBusy(true);
    setDriveError(null);
    try {
      const driveFiles = await listDriveFiles();
      const existingDriveIds = new Set(
        files.filter(f => f.driveFileId).map(f => f.driveFileId),
      );
      let added = 0;
      for (const df of driveFiles) {
        if (existingDriveIds.has(df.id)) continue;
        const type = getFileType(df.name);
        const newFile: FileItem = {
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: df.name,
          type,
          subject: "Unsorted",
          updated: formatDriveDate(df.modifiedTime),
          size: formatFileSize(df.size),
          driveFileId: df.id,
        };
        onAddFile(newFile);
        added++;
      }
      onToast?.(`Synced ${driveFiles.length} files from Drive${added > 0 ? ` (${added} new)` : ""}`);
    } catch (e: any) {
      setDriveError(e?.message || "Sync failed");
    } finally {
      setDriveBusy(false);
    }
  }, [driveConnected, files, onAddFile, onToast]);

  const totalSize = files.reduce((acc, f) => {
    const sizeStr = f.size;
    const num = parseFloat(sizeStr);
    const unit = sizeStr.slice(-2).toUpperCase();
    if (unit === "KB") return acc + num * 1024;
    if (unit === "MB") return acc + num * 1024 * 1024;
    if (unit === "GB") return acc + num * 1024 * 1024 * 1024;
    return acc + num;
  }, 0);

  const cloudCount = files.filter(f => f.driveFileId).length;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Nothing gets lost here</p>
          <h1>Your <span className="blue-underline">files</span></h1>
          <p className="heading-subtitle">
            {files.length} files · {formatFileSize(totalSize)} stored
            {driveConnected && ` · ${cloudCount} on Drive`}
          </p>
        </div>
        <button className="primary-button" onClick={() => fileInputRef.current?.click()}>
          <span className="material-symbols-outlined">upload</span>Upload file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          multiple
        />
      </div>

      {/* Google Drive connection */}
      <div className="storage-card paper-card">
        <div className="storage-icon"><span className="material-symbols-outlined">{driveConnected ? "cloud_done" : "cloud"}</span></div>
        <div>
          <strong>{driveConnected ? "Connected to Google Drive" : "No cloud storage connected"}</strong>
          {driveConnected ? (
            driveStorage ? (
              <>
                <div className="storage-bar"><i style={{ width: `${Math.min(100, Math.round((driveStorage.usage / driveStorage.limit) * 100))}%` }} /></div>
                <small style={{ fontSize: 12, color: "#777871" }}>
                  {formatFileSize(driveStorage.usage)} of {formatFileSize(driveStorage.limit)} used
                </small>
              </>
            ) : null
          ) : (
            <p style={{ fontSize: 13, color: "#777871", margin: "4px 0 0" }}>
              File details are tracked in Timely. Connect Google Drive to upload the
              actual files and sync them across devices.
            </p>
          )}
        </div>
        {driveConnected ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="text-button" onClick={handleSyncFromDrive} disabled={driveBusy}>
              <span className="material-symbols-outlined">{driveBusy ? "hourglass_top" : "sync"}</span> Sync
            </button>
            <button className="text-button danger" onClick={handleDriveDisconnect}>
              <span className="material-symbols-outlined">link_off</span> Disconnect
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                className="text-field"
                value={driveClientId}
                onChange={e => setDriveClientId(e.target.value)}
                placeholder="Google OAuth Client ID"
                style={{ fontSize: 13, padding: "6px 8px", flex: 1 }}
              />
              <button
                className="text-button"
                onClick={() => setShowDriveTutorial(true)}
                title="How do I get a Client ID?"
                style={{ padding: "6px 8px", fontSize: 12, flexShrink: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>help</span>
              </button>
            </div>
            <button className="primary-button" onClick={handleDriveConnect} disabled={!driveClientId.trim() || driveBusy} style={{ fontSize: 13 }}>
              <span className="material-symbols-outlined">login</span> Connect Google Drive
            </button>
          </div>
        )}
      </div>
      {driveError && <small className="status-msg status-error">{driveError}</small>}

      {/* Upload progress */}
      {uploading && (
        <div className="storage-card paper-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="material-symbols-outlined">upload</span>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 13 }}>Uploading "{uploading}" to Drive…</strong>
            <div className="storage-bar"><i style={{ width: `${uploadPercent}%`, transition: "width 0.2s" }} /></div>
          </div>
          <span style={{ fontSize: 13, color: "#777871" }}>{uploadPercent}%</span>
        </div>
      )}

      {/* File dropzone / table */}
      <div
        className={`file-dropzone paper-card ${dragActive ? "drag-active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={files.length > 0 ? () => fileInputRef.current?.click() : undefined}
      >
        {files.length === 0 ? (
          <div className="empty-dropzone">
            <span className="material-symbols-outlined">cloud_upload</span>
            <strong>Drop files here or click to upload</strong>
            <p>
              PDFs, documents, images —{" "}
              {driveConnected
                ? "synced to Google Drive"
                : "listed here; connect Drive to store the files"}
            </p>
          </div>
        ) : (
          <>
            <div className="file-table">
              <div className="file-row file-header"><span>Name</span><span>Subject</span><span>Updated</span><span>Size</span><span /></div>
              {files.map(file => (
                <div key={file.id} className="file-row">
                  <span className="file-name">
                    <span className={`file-type ${file.type}`}>{file.type.toUpperCase()}</span>
                    {file.name}
                    {file.driveFileId && <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#4caf50", marginLeft: 4 }} title="Synced to Drive">cloud_done</span>}
                  </span>
                  <span>{file.subject}</span>
                  <span>{file.updated}</span>
                  <span>{file.size}</span>
                  <span style={{ display: "flex", gap: 4 }}>
                    {file.driveFileId && (
                      <button className="mini-more" onClick={e => { e.stopPropagation(); handleDownload(file); }} aria-label="Download from Drive" title="Download from Drive">
                        <span className="material-symbols-outlined">download</span>
                      </button>
                    )}
                    <button className="mini-more" onClick={e => { e.stopPropagation(); handleDelete(file); }} aria-label="Delete file">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <button className="text-button" style={{ marginTop: 16, width: "100%" }} onClick={() => fileInputRef.current?.click()}>
              <span className="material-symbols-outlined">add</span> Add more files
            </button>
          </>
        )}
      </div>
      {showDriveTutorial && <GoogleDriveTutorialModal onClose={() => setShowDriveTutorial(false)} />}
    </div>
  );
}
