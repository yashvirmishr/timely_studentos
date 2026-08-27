"use client";

import React from "react";
import type { AddType, ClassEvent, ScheduleTab } from "@/lib/types";

interface ScheduleViewProps {
  classes: ClassEvent[];
  onEditClass: (cls: ClassEvent) => void;
  onOpenQuickAdd: (type: AddType) => void;
  onOpenImport: () => void;
  onDismissImported: () => void;
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
  onEditClass,
  onOpenQuickAdd,
  onOpenImport,
  onDismissImported,
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

      <div className="schedule-note">
        <span className="material-symbols-outlined">auto_awesome</span>
        <span>
          <strong>Smart suggestion:</strong> Wednesday has a 90-minute gap before your essay deadline. Want to reserve it for a focused study block?
        </span>
        <button className="text-button" onClick={() => onOpenQuickAdd("task")}>Reserve it</button>
      </div>
    </div>
  );
}