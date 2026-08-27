"use client";

import React, { useState, useEffect } from "react";
import type { ClassEvent } from "@/lib/types";
import { TIMETABLE_SEED } from "@/lib/utils";
import { extractTimetable } from "@/lib/local-ai";

interface ImportModalProps {
  onClose: () => void;
  onImport: (classes: ClassEvent[]) => void;
  importSource: string;
  setImportSource: (source: string) => void;
  importReview: ClassEvent[];
  setImportReview: (classes: ClassEvent[]) => void;
  importConfidence: number | null;
  setImportConfidence: (conf: number | null) => void;
}

export default function ImportModal({
  onClose,
  onImport,
  importSource,
  setImportSource,
  importReview,
  setImportReview,
  importConfidence,
  setImportConfidence,
}: ImportModalProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "review">("upload");
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [source, setSource] = useState(importSource);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSource(importSource);
    setClasses(importReview);
    setStep(importReview.length > 0 ? "review" : "upload");
  }, [importSource, importReview]);

  const startScan = async (file: File) => {
    setError(null);
    setSource(file.name);
    setImportSource(file.name);
    setStep("scanning");
    try {
      const result = await extractTimetable(file);
      const extracted = result.classes
        .filter(c => c.subject && c.day && c.start && c.end)
        .map((c, index) => ({
          ...c,
          id: `import-${Date.now()}-${index}`,
          teacher: c.teacher || "Not specified",
          room: c.room || "TBD",
          color: (c.color && ["lilac", "blue", "green", "yellow", "red"].includes(c.color) ? c.color : "blue") as ClassEvent["color"],
          imported: true,
          checked: true,
        }));
      if (!extracted.length) throw new Error("No classes were found. Try a clearer timetable image or PDF.");
      setClasses(extracted);
      setImportReview(extracted);
      setImportConfidence(result.confidence ?? null);
      setStep("review");
    } catch (scanError: any) {
      setError(scanError?.message || "Timetable scan failed.");
      setStep("upload");
    }
  };

  const startSampleScan = () => {
    setError(null);
    const sample = TIMETABLE_SEED.map(c => ({ ...c, id: `sample-${c.id}`, imported: true, checked: true }));
    setSource("Sample timetable preview");
    setImportSource("Sample timetable preview");
    setClasses(sample);
    setImportReview(sample);
    setImportConfidence(94);
    setStep("review");
  };

  const handleConfirm = () => {
    const selected = classes.filter(c => c.checked);
    onImport(selected);
    onClose();
  };

  const toggleAll = () => {
    const allChecked = classes.every(c => c.checked);
    const updated = classes.map(c => ({ ...c, checked: !allChecked }));
    setClasses(updated);
    setImportReview(updated);
  };

  const handleBackToUpload = () => {
    setStep("upload");
    setClasses([]);
    setImportReview([]);
    setImportConfidence(null);
    setSource("");
    setImportSource("");
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal import-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Skip the spreadsheet</span>
            <h2 style={{ fontSize: 20, fontFamily: "Kalam, cursive", margin: 0 }}>Import your timetable</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="import-stepper">
          <span className={step === "upload" ? "active" : ""}>
            {step === "upload" ? <b>1</b> : "1"} <b>Upload</b>
          </span>
          <i />
          <span className={step === "scanning" ? "active" : ""}>
            {step === "scanning" ? <b>2</b> : "2"} <b>Review</b>
          </span>
          <i />
          <span className={step === "review" ? "active" : ""}>
            {step === "review" ? <b>3</b> : "3"} <b>Import</b>
          </span>
        </div>

        {step === "upload" && (
          <div>
            <label className="upload-dropzone" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 32, borderRadius: 16, border: "2px dashed #d9d2c6", background: "#fdfbf7", cursor: "pointer", textAlign: "center" }}>
              <span className="upload-illustration">
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#2d5da1" }}>document_scanner</span>
              </span>
              <strong>Drop a timetable here</strong>
              <span style={{ color: "#777871" }}>or click to choose a photo, screenshot, or PDF</span>
              <small style={{ color: "#777871" }}>AI will detect subjects, rooms, teachers, breaks, and rotating weeks</small>
              <input type="file" accept="image/*,.pdf" style={{ display: "none" }} id="timetableFile" onChange={(e) => { const f = e.target.files?.[0]; if (f) void startScan(f); }} />
              <button type="button" className="primary-button" onClick={() => document.getElementById("timetableFile")?.click()}>
                <span className="material-symbols-outlined">upload</span> Choose file
              </button>
            </label>
            <div className="import-or">
              <span /><span>or</span><span />
            </div>
            <button className="manual-import-button" onClick={startSampleScan} style={{ width: "100%", padding: 12, borderRadius: 8, background: "#f5f3ef", textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle" }}>auto_awesome</span> Use a sample timetable to preview the magic
            </button>
          </div>
        )}

        {step === "scanning" && (
          <div>
            <div className="scan-animation">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "24px 0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#2d5da1" }}>calendar_month</span>
                <strong>{source}</strong>
                <small style={{ color: "#777871" }}>Looking for the shape of your week...</small>
              </div>
            </div>
            <div className="scan-status">
              <span className="status-dot" />
              <strong style={{ fontSize: 13 }}>Reading subjects and times...</strong>
            </div>
          </div>
        )}

        {error && (
          <div className="status-msg status-error" role="alert" style={{ marginTop: 12 }}>{error}</div>
        )}

        {step === "review" && (
          <div>
            <div className="review-summary">
              <div style={{ display: "flex", gap: 12 }}>
                <span className="material-symbols-outlined" style={{ color: "#4caf50" }}>auto_awesome</span>
                <div>
                  <strong style={{ fontSize: 14, display: "block" }}>Looks like a solid week</strong>
                  <small style={{ color: "#777871" }}>{classes.length} classes found · 1 free period · {source}</small>
                </div>
              </div>
              <span className="confidence-badge">{importConfidence ? `${importConfidence}% confidence` : "94% confidence"}</span>
            </div>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span className="section-kicker">Check the details before they become real</span>
              <button className="text-button" onClick={toggleAll}>
                {classes.every(c => c.checked) ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div style={{ maxHeight: 250, overflowY: "auto" }}>
              {classes.map((c, i) => (
                <div key={c.id} className="review-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 4px", borderBottom: "1px solid #f5f3ef" }}>
                  <input type="checkbox" checked={c.checked || false} onChange={() => {
                    const updated = classes.map((x, j) => j === i ? { ...x, checked: !x.checked } : x);
                    setClasses(updated);
                    setImportReview(updated);
                  }} style={{ display: "none" }} id={"ic" + i} />
                  <label htmlFor={"ic" + i} className="fake-checkbox" style={{ cursor: "pointer" }}>
                    <span className="material-symbols-outlined">check</span>
                  </label>
                  <span className={"review-color " + c.color} />
                  <div style={{ flex: 1 }}>
                    <input value={c.subject} onChange={e => {
                      const updated = classes.map((x, j) => j === i ? { ...x, subject: e.target.value } : x);
                      setClasses(updated);
                      setImportReview(updated);
                    }} style={{ background: "transparent", border: "1px solid transparent", padding: "2px 4px", borderRadius: 4, fontSize: 13, display: "block" }} />
                    <span style={{ fontSize: 11, color: "#777871" }}>
                      <input value={c.day} onChange={e => {
                        const updated = classes.map((x, j) => j === i ? { ...x, day: e.target.value } : x);
                        setClasses(updated);
                        setImportReview(updated);
                      }} style={{ width: 30, background: "transparent", border: "1px solid transparent", padding: "2px 4px", borderRadius: 4, fontSize: 11 }} />
                      <input value={c.start} onChange={e => {
                        const updated = classes.map((x, j) => j === i ? { ...x, start: e.target.value } : x);
                        setClasses(updated);
                        setImportReview(updated);
                      }} style={{ width: 48, background: "transparent", border: "1px solid transparent", padding: "2px 4px", borderRadius: 4, fontSize: 11 }} />
                      {" — "}
                      <input value={c.end} onChange={e => {
                        const updated = classes.map((x, j) => j === i ? { ...x, end: e.target.value } : x);
                        setClasses(updated);
                        setImportReview(updated);
                      }} style={{ width: 48, background: "transparent", border: "1px solid transparent", padding: "2px 4px", borderRadius: 4, fontSize: 11 }} />
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={c.room} onChange={e => {
                      const updated = classes.map((x, j) => j === i ? { ...x, room: e.target.value } : x);
                      setClasses(updated);
                      setImportReview(updated);
                    }} style={{ width: 70, background: "transparent", border: "1px solid transparent", padding: "2px 4px", borderRadius: 4, fontSize: 11 }} />
                    <input value={c.teacher} onChange={e => {
                      const updated = classes.map((x, j) => j === i ? { ...x, teacher: e.target.value } : x);
                      setClasses(updated);
                      setImportReview(updated);
                    }} style={{ width: 90, background: "transparent", border: "1px solid transparent", padding: "2px 4px", borderRadius: 4, fontSize: 11 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="review-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button className="text-button" onClick={handleBackToUpload}>
                <span className="material-symbols-outlined">arrow_back</span> Start over
              </button>
              <button className="primary-button" onClick={handleConfirm}>
                <span className="material-symbols-outlined">calendar_add_on</span> Import selected classes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}