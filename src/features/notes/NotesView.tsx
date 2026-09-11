"use client";

import React, { useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import type { Note, AddType, Subject } from "@/lib/types";
import { chatWithLocalAi } from "@/lib/local-ai";

interface NotesViewProps {
  notes: Note[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onOpenQuickAdd: (type: AddType, item?: Note) => void;
  noteAiTarget: Note | null;
  setNoteAiTarget: (note: Note | null) => void;
  subjects: Subject[];
}



export default function NotesView({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onOpenQuickAdd,
  noteAiTarget,
  setNoteAiTarget,
  subjects,
}: NotesViewProps) {
  const subjectColorMap = Object.fromEntries(
    subjects.map(s => [s.name, s.color])
  ) as Record<string, "yellow" | "blue" | "lilac" | "green" | "red">;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("All notes");
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryError, setAiSummaryError] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  const aiTrapRef = useFocusTrap(showAiModal);

  const filteredNotes = notes.filter(n => {
    const matchesSearch = !searchQuery || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSubject === "All notes" || n.subject === filterSubject;
    return matchesSearch && matchesFilter;
  });

  const filterSubjects = ["All notes", ...Array.from(new Set(notes.map(n => n.subject)))];

  const handleAiSummary = (note: Note) => {
    setNoteAiTarget(note);
    setAiSummary("");
    setAiSummaryError("");
    setShowAiModal(true);
  };

  const summarizeNote = async () => {
    if (!noteAiTarget) return;
    setIsSummarizing(true);
    setAiSummaryError("");
    try {
      const reply = await chatWithLocalAi({
        messages: [
          {
            role: "system",
            content: "You are a concise study companion. Summarize the supplied note in 2-3 sentences, then list up to 3 key points. Use only the note content and say when the note lacks enough detail.",
          },
          { role: "user", content: `Title: ${noteAiTarget.title}\nSubject: ${noteAiTarget.subject}\nNote:\n${noteAiTarget.preview}` },
        ],
      });
      setAiSummary(reply);
    } catch (error: any) {
      setAiSummaryError(error?.message || "Enable Gemini in Profile to generate a summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAiClose = () => {
    setShowAiModal(false);
    setNoteAiTarget(null);
    setAiSummary("");
    setAiSummaryError("");
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your thinking, collected</p>
          <h1>Notes <span className="yellow-underline">library</span></h1>
          <p className="heading-subtitle">
            {notes.length} note{notes.length === 1 ? "" : "s"}
            {/* "Last edited" comes from the most recent note, never from the clock. */}
            {notes[0]?.ago ? ` · Last edited ${notes[0].ago.toLowerCase()}` : ""}
          </p>
        </div>
        <button className="primary-button" onClick={() => onOpenQuickAdd("note")}>
          <span className="material-symbols-outlined">add</span>New note
        </button>
      </div>
      <div className="notes-toolbar paper-card">
        <div className="search-inline">
          <span className="material-symbols-outlined">search</span>
          <input
            placeholder="Search your notes"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {filterSubjects.map((s, i) => (
            <button key={i} className={filterSubject === s ? "active" : ""} onClick={() => setFilterSubject(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="notes-grid">
        {filteredNotes.length === 0 ? (
          <div className="empty-state paper-card">
            <span className="material-symbols-outlined">sticky_note_2</span>
            <strong>No notes found</strong>
            <p>{searchQuery ? "Try a different search term." : "Capture your first idea."}</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <article key={note.id} className={`note-card ${subjectColorMap[note.subject] || "yellow"}-note ${note.pinned ? "pinned" : ""}`}>
              {note.pinned && <span className="note-pin" />}
              <span className="note-label">{note.subject.toUpperCase()} · {note.ago}</span>
              <h3>{note.title}</h3>
              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note.preview}</p>
              <div className="note-footer">
                <span>{note.footer || (note.hasAiSummary ? "✦ AI summary ready" : "Edited just now")}</span>
                <div className="row-actions note-actions">
                  <button type="button" onClick={() => handleAiSummary(note)} aria-label="Summarize note">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </button>
                  <button type="button" onClick={() => onOpenQuickAdd("note", note)} aria-label="Edit note">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button type="button" onClick={() => onDeleteNote(note.id)} aria-label="Delete note">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {showAiModal && noteAiTarget && (
        <div className="modal-backdrop" ref={aiTrapRef as React.RefObject<HTMLDivElement>} onClick={handleAiClose}>
          <div className="modal ai-modal" role="dialog" aria-modal="true" aria-labelledby="noteAiTitle" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">Local AI · original stays untouched</span>
                <h2 id="noteAiTitle">Note companion</h2>
              </div>
              <button className="icon-button" onClick={handleAiClose} aria-label="Close note summary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div id="noteAiOriginal" className="ai-original-note">
              <span className="ai-review-badge">Original note · never overwritten</span>
              <h3>{noteAiTarget.title}</h3>
              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{noteAiTarget.preview}</p>
            </div>
            <div id="noteAiResult" className="ai-result-note">
              {!aiSummary && !aiSummaryError && <div className="ai-modal-status">Ready to generate a study companion with Gemini.</div>}
              {aiSummaryError && <div className="ai-modal-status status-error" role="alert">{aiSummaryError}</div>}
              {aiSummary && (
                <>
                  <span className="ai-review-badge">AI-generated · original preserved</span>
                  <h3>Study summary</h3>
                  <p style={{ whiteSpace: "pre-wrap" }}>{aiSummary}</p>
                </>
              )}
              <button className="primary-button" id="summarizeNoteButton" onClick={summarizeNote} disabled={isSummarizing}>
                <span className="material-symbols-outlined">{isSummarizing ? "hourglass_top" : "auto_awesome"}</span>
                {isSummarizing ? "Generating..." : aiSummary ? "Generate again" : "Generate summary"}
              </button>
            </div>
            <div className="ai-modal-actions">
              <button className="text-button" onClick={handleAiClose}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}