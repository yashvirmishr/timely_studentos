"use client";

import React, { useState, useMemo } from "react";
import type { ViewName, Task, ClassEvent, Note, FileItem } from "@/lib/types";

interface SearchModalProps {
  onClose: () => void;
  onNavigate: (view: ViewName) => void;
  tasks: Task[];
  classes: ClassEvent[];
  notes: Note[];
  files: FileItem[];
}

interface SearchResult {
  type: "task" | "class" | "note" | "file";
  title: string;
  desc: string;
  icon: string;
  color: string;
  view: ViewName;
  id: string;
}

export default function SearchModal({ onClose, onNavigate, tasks, classes, notes, files }: SearchModalProps) {
  const [query, setQuery] = useState("");

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];

    const normalized = query.toLowerCase();
    const allResults: SearchResult[] = [];

    // Tasks
    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(normalized) || t.subject.toLowerCase().includes(normalized)) {
        allResults.push({
          type: "task",
          title: t.title,
          desc: `Task · ${t.subject} · due ${t.due} · ${t.priority}`,
          icon: "task_alt",
          color: "#f5a623",
          view: "academics",
          id: t.id,
        });
      }
    });

    // Classes
    classes.forEach(c => {
      if (c.subject.toLowerCase().includes(normalized) || c.teacher.toLowerCase().includes(normalized) || c.room.toLowerCase().includes(normalized)) {
        allResults.push({
          type: "class",
          title: c.subject,
          desc: `Class · ${c.day} · ${c.start} · ${c.room}`,
          icon: "calendar_month",
          color: "#2d5da1",
          view: "schedule",
          id: c.id,
        });
      }
    });

    // Notes
    notes.forEach(n => {
      if (n.title.toLowerCase().includes(normalized) || n.preview.toLowerCase().includes(normalized) || n.subject.toLowerCase().includes(normalized)) {
        allResults.push({
          type: "note",
          title: n.title,
          desc: `Note · ${n.subject} · ${n.ago}`,
          icon: "sticky_note_2",
          color: "#ff4d4d",
          view: "notes",
          id: n.id,
        });
      }
    });

    // Files
    files.forEach(f => {
      if (f.name.toLowerCase().includes(normalized) || f.subject.toLowerCase().includes(normalized)) {
        allResults.push({
          type: "file",
          title: f.name,
          desc: `File · ${f.subject} · ${f.size} · ${f.updated}`,
          icon: "folder_open",
          color: "#2d5da1",
          view: "files",
          id: f.id,
        });
      }
    });

    return allResults.slice(0, 10);
  }, [query, tasks, classes, notes, files]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal search-modal" role="dialog" aria-modal="true" aria-label="Search">
        <div className="search-modal-input" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="material-symbols-outlined" style={{ color: '#777871' }}>search</span>
          <input
            placeholder="Search subjects, tasks, notes, files..."
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 16, outline: 'none' }}
          />
        </div>
        <div className="search-results">
          <span className="section-kicker" style={{ marginBottom: 8, display: 'block' }}>
            {query.trim() ? `${results.length} matches` : "Quick find"}
          </span>
          {results.length === 0 && query.trim() ? (
            <div className="empty-state" style={{ padding: 24, textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#777871" }}>search_off</span>
              <strong style={{ display: "block", marginTop: 8 }}>No matches</strong>
              <p style={{ color: "#777871", fontSize: 13 }}>Try a subject, task, note, or file name.</p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {["schedule", "academics", "notes", "files"].map(v => (
                <button
                  key={v}
                  onClick={() => { onNavigate(v as ViewName); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12, borderRadius: 8, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ef')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="material-symbols-outlined" style={{ color: '#777871' }}>
                    {v === "schedule" ? "calendar_month" : v === "academics" ? "menu_book" : v === "notes" ? "sticky_note_2" : "folder_open"}
                  </span>
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: 14 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</strong>
                    <small style={{ color: '#777871', fontSize: 12 }}>Browse {v}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={i}
                onClick={() => { onNavigate(item.view); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12, borderRadius: 8, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ef')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="material-symbols-outlined" style={{ color: item.color }}>{item.icon}</span>
                <span style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: 14 }}>{item.title}</strong>
                  <small style={{ color: '#777871', fontSize: 12 }}>{item.desc}</small>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}