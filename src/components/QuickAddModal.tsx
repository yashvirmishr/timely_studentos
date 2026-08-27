"use client";

import React, { useState, useEffect } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import type { AddType, Task, ClassEvent, Note } from "@/lib/types";

interface QuickAddModalProps {
  addType: AddType;
  onAddTypeChange: (type: AddType) => void;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddClass: (cls: ClassEvent) => void;
  onUpdateClass: (id: string, updates: Partial<ClassEvent>) => void;
  onAddNote: (note: Note) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onShowToast: (message: string) => void;
  editingId: string | null;
  initialItem: Task | ClassEvent | Note | null;
  setEditingId: (id: string | null) => void;
}

const TYPE_LABELS: Record<AddType, { title: string; placeholder: string }> = {
  task: { title: "Quick add", placeholder: "e.g. Review chapter 6 notes" },
  event: { title: "Add event", placeholder: "What is happening?" },
  note: { title: "Add note", placeholder: "What do you want to remember?" },
  exam: { title: "Add exam", placeholder: "Which exam is coming up?" },
};

const SUBJECTS = ["World History", "Advanced Calculus", "English Literature", "Art & Design", "Biology", "Other"];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const COLORS = ["lilac", "blue", "green", "yellow", "red"];
const SUBJECT_COLORS: Record<string, "lilac" | "blue" | "green" | "yellow" | "red"> = {
  "World History": "yellow",
  "Advanced Calculus": "blue",
  "English Literature": "lilac",
  "Art & Design": "green",
  "Biology": "blue",
  "Other": "red",
};

export default function QuickAddModal({
  addType,
  onAddTypeChange,
  onClose,
  onAddTask,
  onUpdateTask,
  onAddClass,
  onUpdateClass,
  onAddNote,
  onUpdateNote,
  onShowToast,
  editingId,
  initialItem,
  setEditingId,
}: QuickAddModalProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("World History");
  const [due, setDue] = useState("Today");
  const [estimate, setEstimate] = useState(30);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [day, setDay] = useState("TUE");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:15");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [color, setColor] = useState<"lilac" | "blue" | "green" | "yellow" | "red">("blue");
  const [body, setBody] = useState("");
  const [remind, setRemind] = useState(true);

  const isEditing = editingId !== null;

  // Reset form when addType changes or modal closes
  useEffect(() => {
    const item = initialItem;
    setTitle(item ? ("title" in item ? item.title : item.subject) : "");
    setSubject(item?.subject || "World History");
    setDue(item && "due" in item ? item.due : "Today");
    setEstimate(item && "time" in item ? parseInt(item.time, 10) || 30 : 30);
    setPriority(item && "priority" in item ? item.priority : "medium");
    setDay(item && "day" in item ? item.day : "TUE");
    setStart(item && "start" in item ? item.start : "10:00");
    setEnd(item && "end" in item ? item.end : "11:15");
    setRoom(item && "room" in item ? item.room : "");
    setTeacher(item && "teacher" in item ? item.teacher : "");
    setColor(item && "color" in item ? item.color : "blue");
    setBody(item && "preview" in item ? item.preview : "");
    setRemind(true);
  }, [addType, initialItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const now = new Date();
    const ago = "JUST NOW";

    if (addType === "task") {
      const task: Task = {
        id: isEditing ? editingId! : "t" + Date.now(),
        title: title.trim(),
        subject,
        due: due.toLowerCase(),
        time: `${estimate} min`,
        priority: priority,
        completed: false,
        custom: true,
        notes: remind ? "Remind me the day before" : undefined,
      };
      if (isEditing) onUpdateTask(editingId!, task);
      else onAddTask(task);
      onShowToast(`${isEditing ? "Task updated" : "Task added"} in Timely`);
    } else if (addType === "exam") {
      const task: Task = {
        id: isEditing ? editingId! : "t" + Date.now(),
        title: title.trim(),
        subject,
        due: due.toLowerCase(),
        time: `${estimate} min`,
        priority: "high",
        completed: false,
        custom: true,
        notes: remind ? "Remind me the day before" : undefined,
      };
      if (isEditing) onUpdateTask(editingId!, task);
      else onAddTask(task);
      onShowToast(`${isEditing ? "Exam updated" : "Exam added"} in Timely`);
    } else if (addType === "event") {
      const cls: ClassEvent = {
        id: isEditing ? editingId! : "c" + Date.now(),
        subject: title.trim(),
        teacher: teacher || "Added by you",
        room: room || "TBD",
        day,
        start,
        end,
        color,
        imported: false,
      };
      if (isEditing) onUpdateClass(editingId!, cls);
      else onAddClass(cls);
      onShowToast(`${isEditing ? "Class updated" : "Class added"} in your schedule`);
    } else if (addType === "note") {
      const note: Note = {
        id: isEditing ? editingId! : "n" + Date.now(),
        subject,
        ago,
        title: title.trim(),
        preview: body,
        color: SUBJECT_COLORS[subject] || "yellow",
        pinned: false,
        hasAiSummary: false,
        body,
        footer: "Edited just now",
      };
      if (isEditing) onUpdateNote(editingId!, note);
      else onAddNote(note);
      onShowToast(`${isEditing ? "Note updated" : "Note added"} in your library`);
    }

    setEditingId(null);
    onClose();
  };

  useEffect(() => {
    setColor(SUBJECT_COLORS[subject] || "blue");
  }, [subject]);

  const trapRef = useFocusTrap(true);

  const renderFields = () => {
    switch (addType) {
      case "task":
      case "exam":
        return (
          <>
            <div className="form-grid">
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>Subject</span>
                <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>When</span>
                <select value={due} onChange={e => setDue(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }}>
                  <option>Today</option>
                  <option>Tomorrow</option>
                  <option>This week</option>
                  <option>Pick a date</option>
                </select>
              </label>
            </div>
            <label className="estimate-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: '#5c5c5c' }}>Time estimate</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{estimate} min</span>
              <input type="range" min={5} max={120} value={estimate} onChange={e => setEstimate(Number(e.target.value))} style={{ flex: 1, accentColor: '#2d2d2d' }} />
            </label>
            {addType !== "exam" && (
              <label style={{ display: 'block', marginTop: 12 }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>Priority</span>
                <select value={priority} onChange={e => setPriority(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            )}
            <label className="check-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13 }}>
              <input type="checkbox" checked={remind} onChange={e => setRemind(e.target.checked)} />
              <span className="fake-checkbox"><span className="material-symbols-outlined">check</span></span>
              Remind me the day before
            </label>
          </>
        );
      case "event":
        return (
          <>
            <div className="form-grid">
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>Subject</span>
                <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>Day</span>
                <select value={day} onChange={e => setDay(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>Start</span>
                <input type="time" value={start} onChange={e => setStart(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>End</span>
                <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }} />
              </label>
            </div>
            <div className="form-grid">
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>Room</span>
                <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. C02" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 13, color: '#5c5c5c' }}>Teacher</span>
                <input type="text" value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="e.g. Dr. Chen" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }} />
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>
              <span style={{ fontSize: 13, color: '#5c5c5c' }}>Color</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? "active" : ""}`}
                    onClick={() => setColor(c as any)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                      background: `var(--color-${c})`
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </label>
          </>
        );
      case "note":
        return (
          <>
            <label style={{ display: 'block', marginTop: 12 }}>
              <span style={{ fontSize: 13, color: '#5c5c5c' }}>Subject</span>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginTop: 12 }}>
              <span style={{ fontSize: 13, color: '#5c5c5c' }}>Note</span>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your note here..."
                rows={4}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </label>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-backdrop" ref={trapRef as React.RefObject<HTMLDivElement>} onClick={(e) => { if (e.target === e.currentTarget) { setEditingId(null); onClose(); } }}>
      <div className="modal quick-add-modal" role="dialog" aria-modal="true" aria-labelledby="qaTitle">
        <div className="modal-header">
          <div>
            <span className="section-kicker">Make it real</span>
            <h2 id="qaTitle" style={{ fontSize: 20, fontFamily: 'Kalam, cursive', margin: 0 }}>
              {isEditing ? `Edit ${TYPE_LABELS[addType].title}` : TYPE_LABELS[addType].title}
            </h2>
          </div>
          <button className="icon-button" onClick={() => { setEditingId(null); onClose(); }} aria-label="Close dialog">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="add-type-tabs">
          {(["task", "event", "note", "exam"] as AddType[]).map(type => (
            <button key={type} className={addType === type ? "active" : ""} onClick={() => { onAddTypeChange(type); setEditingId(null); }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {type === "task" ? "check_circle" : type === "event" ? "event" : type === "note" ? "sticky_note_2" : "school"}
              </span>
              {type[0].toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#5c5c5c' }}>{TYPE_LABELS[addType].placeholder.split("?")[0]}</span>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={TYPE_LABELS[addType].placeholder}
              required
              autoFocus
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 4, background: '#f5f3ef', border: '1px solid #d9d2c6', fontSize: 14 }}
            />
          </label>
          {renderFields()}
          <button className="primary-button full-button" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
            <span className="material-symbols-outlined">{isEditing ? "save" : "add"}</span>
            {isEditing ? "Save changes" : "Add to Timely"}
          </button>
        </form>
        <button className="scan-link" onClick={() => { setEditingId(null); onClose(); }} style={{ marginTop: 12 }}>
          <span className="material-symbols-outlined">document_scanner</span>
          Or scan a photo with AI
        </button>
      </div>
    </div>
  );
}