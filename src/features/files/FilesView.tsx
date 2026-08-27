"use client";

import React, { useState, useRef } from "react";
import type { FileItem } from "@/lib/types";

interface FilesViewProps {
  files: FileItem[];
  onAddFile: (file: FileItem) => void;
  onDeleteFile: (id: string) => void;
}

function getFileType(name: string): "pdf" | "doc" | "img" {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext || "")) return "doc";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) return "img";
  return "doc";
}

const GB = 1024 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / GB).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FilesView({ files, onAddFile, onDeleteFile }: FilesViewProps) {
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    const type = getFileType(file.name);
    const newFile: FileItem = {
      id: `file-${Date.now()}`,
      name: file.name,
      type,
      subject: "Unsorted",
      updated: formatDate(new Date()),
      size: formatFileSize(file.size),
    };
    onAddFile(newFile);
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

  const totalSize = files.reduce((acc, f) => {
    const sizeStr = f.size;
    const num = parseFloat(sizeStr);
    const unit = sizeStr.slice(-2).toUpperCase();
    if (unit === "KB") return acc + num * 1024;
    if (unit === "MB") return acc + num * 1024 * 1024;
    if (unit === "GB") return acc + num * 1024 * 1024 * 1024;
    return acc + num;
  }, 0);

  const usedPercent = Math.min(100, (totalSize / (5 * GB)) * 100);

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Nothing gets lost here</p>
          <h1>Your <span className="blue-underline">files</span></h1>
          <p className="heading-subtitle">
            {files.length} files · {formatFileSize(totalSize)} stored
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
      <div className="storage-card paper-card">
        <div className="storage-icon"><span className="material-symbols-outlined">cloud</span></div>
        <div>
          <strong>{formatFileSize(totalSize)} <span>of 5 GB used</span></strong>
          <div className="storage-bar"><i style={{ width: `${usedPercent}%` }} /></div>
        </div>
        <span className="storage-limit-note">Local storage · 5 GB display limit</span>
      </div>
      <div
        className={`file-dropzone paper-card ${dragActive ? "drag-active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        {files.length === 0 && !showUpload ? (
          <div className="empty-dropzone">
            <span className="material-symbols-outlined">cloud_upload</span>
            <strong>Drop files here or click to upload</strong>
            <p>PDFs, documents, images — everything stays on your device</p>
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
                  </span>
                  <span>{file.subject}</span>
                  <span>{file.updated}</span>
                  <span>{file.size}</span>
                  <button className="mini-more" onClick={() => onDeleteFile(file.id)} aria-label="Delete file">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
            <button className="text-button" style={{ marginTop: 16, width: "100%" }} onClick={() => fileInputRef.current?.click()}>
              <span className="material-symbols-outlined">add</span> Add more files
            </button>
          </>
        )}
      </div>
    </div>
  );
}