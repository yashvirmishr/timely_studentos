"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import type { AddType, ClassEvent, ScheduleTab, Task, Subject } from "@/lib/types";
import type { ScheduleSuggestion } from "@/lib/local-ai";

interface ScheduleViewProps {
  classes: ClassEvent[];
  tasks?: Task[];
  subjects?: Subject[];
  aiOnline?: boolean;
  aiEnabled?: boolean;
  onEditClass: (cls: ClassEvent) => void;
  onOpenQuickAdd: (type: AddType) => void;
  onOpenImport: () => void;
  onDismissImported: () => void;
  onNavigateToProfile?: () => void;
  weekOffset: number;
  setWeekOffset: (offset: number) => void;
  scheduleTab: ScheduleTab;
  setScheduleTab: (tab: ScheduleTab) => void;
  onAddClass: (cls: ClassEvent) => void;
  onUpdateClass: (id: string, updates: Partial<ClassEvent>) => void;
  onDeleteClass: (id: string) => void;
  onImportGoogleCalendar: () => void;
  googleCalendarBusy?: boolean;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIMES = ["08:00", "10:00", "11:30", "14:00"];
const COLOR_MAP: Record<string, string> = {
  lilac: "lilac-block", blue: "blue-block", green: "green-block", yellow: "yellow-block", red: "red-block"
};

function getRowIndex(start: string): number {
  if (start < "09:30") return 0;
  if (start < "11:30") return 1;
  if (start < "14:00") return 2;
  return 3;
}

function getWeekMonday(offset: number): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun 1=Mon … 6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDayDate(offset: number, dayIndex: number): Date {
  const monday = getWeekMonday(offset);
  const date = new Date(monday);
  date.setDate(monday.getDate() + dayIndex);
  return date;
}

function formatWeekLabel(offset: number): string {
  const start = getWeekMonday(offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const monthStart = start.toLocaleString("en-US", { month: "short" });
  const monthEnd = end.toLocaleString("en-US", { month: "short" });
  return `${monthStart} ${start.getDate()} — ${monthEnd} ${end.getDate()}, ${end.getFullYear()}`;
}

export default function ScheduleView({
  classes,
  tasks = [],
  subjects = [],
  aiOnline = false,
  aiEnabled = false,
  onEditClass,
  onOpenQuickAdd,
  onOpenImport,
  onDismissImported,
  onNavigateToProfile,
  weekOffset,
  setWeekOffset,
  scheduleTab,
  setScheduleTab,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onImportGoogleCalendar,
  googleCalendarBusy = false,
}: ScheduleViewProps) {
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const isCurrentWeek = weekOffset === 0;

  // --- AI-powered smart suggestions (carousel) ---
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const suggestionFetched = useRef(false);

  const fetchSuggestion = useCallback(async () => {
    if (!aiOnline || !aiEnabled || classes.length === 0) return;
    setSuggestionLoading(true);
    try {
      const { generateScheduleSuggestions } = await import("@/lib/local-ai");
      const result = await generateScheduleSuggestions({
        classes: classes.map(c => ({ subject: c.subject, day: c.day, start: c.start, end: c.end, room: c.room, teacher: c.teacher })),
        tasks: tasks.map(t => ({ title: t.title, subject: t.subject, due: t.due, priority: t.priority, completed: t.completed })),
        subjects: subjects.map(s => ({ name: s.name, preparedness: s.preparedness, tasksDue: s.tasksDue, urgent: s.urgent })),
      });
      setSuggestions(result);
      setSuggestionIndex(0);
    } catch {
      // Silently fall back — suggestions are non-critical
    } finally {
      setSuggestionLoading(false);
    }
  }, [aiOnline, aiEnabled, classes, tasks, subjects]);

  useEffect(() => {
    if (suggestionFetched.current) return;
    if (aiOnline && aiEnabled && classes.length > 0) {
      suggestionFetched.current = true;
      fetchSuggestion();
    }
  }, [aiOnline, aiEnabled, classes.length, fetchSuggestion]);

  if (scheduleTab === "agenda" || scheduleTab === "day") {
    const agendaDays = scheduleTab === "day" ? [DAYS[todayIndex] || "MON"] : DAYS;
    return (
      <div>
        <div className="page-heading">
          <div>
            <p className="eyebrow">Your week at a glance</p>
            <h1>Schedule <span className="blue-underline">in ink</span></h1>
            <p className="heading-subtitle">{formatWeekLabel(weekOffset)}</p>
          </div>
          <div className="heading-actions">
            <button className="text-button" onClick={onOpenImport}>
              <span className="material-symbols-outlined">document_scanner</span>Import timetable
            </button>
            <button className="text-button" onClick={onImportGoogleCalendar} disabled={googleCalendarBusy}>
              <span className="material-symbols-outlined">event</span>{googleCalendarBusy ? "Syncing calendar..." : "Sync Google Calendar"}
            </button>
            <button className="primary-button" onClick={() => onOpenQuickAdd("event")}>
              <span className="material-symbols-outlined">add</span>Add class
            </button>
          </div>
        </div>
        <div className="schedule-toolbar paper-card">
          <div className="week-switcher">
            <button className="icon-button small" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week"><span className="material-symbols-outlined">chevron_left</span></button>
            <strong>{formatWeekLabel(weekOffset)}</strong>
            <button className="icon-button small" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
          <div className="view-tabs">
            <button className={(scheduleTab as ScheduleTab) === "week" ? "active" : ""} onClick={() => setScheduleTab("week")}>Week</button>
            <button className={(scheduleTab as ScheduleTab) === "day" ? "active" : ""} onClick={() => setScheduleTab("day")}>Day</button>
            <button className={(scheduleTab as ScheduleTab) === "agenda" ? "active" : ""} onClick={() => setScheduleTab("agenda")}>Agenda</button>
          </div>
        </div>
        <div className="agenda-view paper-card">
          {agendaDays.map((day) => {
            const dayIndex = DAYS.indexOf(day);
            const dayClasses = classes.filter(c => c.day === day).sort((a, b) => a.start.localeCompare(b.start));
            if (dayClasses.length === 0) return null;
            return (
              <div key={day} className="agenda-day">
                <div className="agenda-day-header">
                  <span className={`agenda-day-label ${isCurrentWeek && dayIndex === todayIndex ? "today" : ""}`}>{DAY_LABELS[dayIndex]}</span>
                </div>
                {dayClasses.map(cls => (
                  <div key={cls.id} className="agenda-item">
                    <div className="agenda-time">
                      <strong>{cls.start}</strong>
                      <small>{cls.end}</small>
                    </div>
                    <div className={`agenda-color ${cls.color}`} />
                    <div className="agenda-info">
                      <strong>{cls.subject}</strong>
                      <small>{cls.room} · {cls.teacher}</small>
                    </div>
                    <div className="agenda-actions">
                      <button className="text-button small" onClick={() => onEditClass(cls)}>Edit</button>
                      <button className="text-button small danger" onClick={() => onDeleteClass(cls.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your week at a glance</p>
          <h1>Schedule <span className="blue-underline">in ink</span></h1>
          <p className="heading-subtitle">{formatWeekLabel(weekOffset)}</p>
        </div>
        <div className="heading-actions">
          <button className="text-button" onClick={onOpenImport}>
            <span className="material-symbols-outlined">document_scanner</span>Import timetable
          </button>
          <button className="primary-button" onClick={() => onOpenQuickAdd("event")}>
            <span className="material-symbols-outlined">add</span>Add class
          </button>
        </div>
      </div>

      <div className="schedule-toolbar paper-card">
        <div className="week-switcher">
          <button className="icon-button small" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <strong>{formatWeekLabel(weekOffset)}</strong>
          <button className="icon-button small" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <div className="view-tabs">
          <button className={scheduleTab === "week" ? "active" : ""} onClick={() => setScheduleTab("week")}>Week</button>
          <button className={(scheduleTab as ScheduleTab) === "day" ? "active" : ""} onClick={() => setScheduleTab("day")}>Day</button>
          <button className={(scheduleTab as ScheduleTab) === "agenda" ? "active" : ""} onClick={() => setScheduleTab("agenda")}>Agenda</button>
        </div>
      </div>

      <div className="week-scroll">
        <div className="week-grid paper-card">
          <div className="week-corner" />
          {DAYS.map((day, i) => {
            const dayDate = getWeekDayDate(weekOffset, i);
            return (
              <div key={day} className={`day-heading ${isCurrentWeek && i === todayIndex ? "today-day" : ""}`}>
                <span>{DAY_LABELS[i]}</span>
                <strong>{dayDate.getDate()}</strong>
              </div>
            );
          })}
          {TIMES.map((time, timeIdx) => (
            <React.Fragment key={time}>
              <div className="time-label">{time}</div>
              {DAYS.map((day, dayIdx) => (
                <div key={`${time}-${day}`} className={`grid-cell ${isCurrentWeek && dayIdx === todayIndex ? "today-cell" : ""}`}>
                  {classes
                    .filter(c => c.day === day && getRowIndex(c.start) === timeIdx)
                    .map(cls => (
                      <div
                        key={cls.id}
                        className={`class-block ${COLOR_MAP[cls.color]}`}
                        onClick={() => onEditClass(cls)}
                      >
                        <strong>{cls.subject}</strong>
                        <small>{cls.room} · {cls.start}</small>
                      </div>
                    ))}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {!aiOnline && aiEnabled && classes.length > 0 && (
        <div className="schedule-note">
          <span className="material-symbols-outlined">vpn_key</span>
          <span>
            <strong>Smart suggestions are AI-powered.</strong> Connect your Gemini API key in Profile to get personalized schedule tips.
          </span>
          <button className="text-button" onClick={onNavigateToProfile}>
            <span className="material-symbols-outlined">settings</span>Connect Gemini
          </button>
        </div>
      )}
      {!aiEnabled && classes.length > 0 && (
        <div className="schedule-note">
          <span className="material-symbols-outlined">auto_awesome</span>
          <span>
            <strong>Smart suggestions are AI-powered.</strong> Enable Gemini in Profile to get personalized schedule tips like study blocks and gap analysis.
          </span>
          <button className="text-button" onClick={onNavigateToProfile}>
            <span className="material-symbols-outlined">settings</span>Enable in Profile
          </button>
        </div>
      )}
      {aiOnline && suggestionLoading && classes.length > 0 && (
        <div className="schedule-note">
          <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>auto_awesome</span>
          <span><strong>Thinking of smart suggestions…</strong></span>
          <button className="icon-button small" disabled aria-label="Loading suggestions" style={{ opacity: 0.4 }}>
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      )}
      {aiOnline && !suggestionLoading && suggestions.length > 0 && classes.length > 0 && (
        <div className="schedule-note" style={{ gap: 12 }}>
          <span className="material-symbols-outlined">auto_awesome</span>
          <button
            className="icon-button small"
            onClick={() => setSuggestionIndex(i => (i - 1 + suggestions.length) % suggestions.length)}
            aria-label="Previous suggestion"
            style={{ flexShrink: 0 }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span style={{ flex: 1 }}>
            <strong>Smart suggestion:</strong> {suggestions[suggestionIndex].text}
          </span>
          <button
            className="icon-button small"
            onClick={() => setSuggestionIndex(i => (i + 1) % suggestions.length)}
            aria-label="Next suggestion"
            style={{ flexShrink: 0 }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <span style={{ font: '9px "DM Mono", monospace', color: '#aaa79e', flexShrink: 0 }}>
            {suggestionIndex + 1}/{suggestions.length}
          </span>
          <button className="icon-button small" onClick={fetchSuggestion} disabled={suggestionLoading} aria-label="Refresh suggestions" title="Get new suggestions">
            <span className="material-symbols-outlined">refresh</span>
          </button>
          <button className="text-button" onClick={() => onOpenQuickAdd(suggestions[suggestionIndex].actionType === "study_block" || suggestions[suggestionIndex].actionType === "task" ? "task" : "event")}>
            {suggestions[suggestionIndex].actionLabel || "Got it"}
          </button>
        </div>
      )}
    </div>
  );
}