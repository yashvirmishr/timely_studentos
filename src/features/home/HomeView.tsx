"use client";

import React from "react";
import PomodoroTimer from "@/components/PomodoroTimer";
import type { ViewName, AddType, Task, ClassEvent, Subject } from "@/lib/types";
import { useTimelyStore } from "@/lib/store";
import type { PomodoroState } from "@/lib/usePomodoro";

interface HomeViewProps {
  onNavigate: (view: ViewName) => void;
  onOpenQuickAdd: (type: AddType) => void;
  tasks: Task[];
  classes: ClassEvent[];
  subjects: Subject[];
  onTaskToggle: (taskId: string) => void;
  pomodoro: PomodoroState;
  briefing?: string;
  briefingLoading?: boolean;
  onGenerateBriefing?: () => void;
}

export default function HomeView({ onNavigate, onOpenQuickAdd, tasks, classes, subjects, onTaskToggle, pomodoro, briefing, briefingLoading, onGenerateBriefing }: HomeViewProps) {
  const priorityClass = (p: string) => p === "high" ? "high" : p === "medium" ? "medium" : "low";
  const subjectDot = (s: string) => s.includes("History") ? "dot-history" : s.includes("Calculus") ? "dot-calc" : s.includes("English") ? "dot-english" : "dot-calc";
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dueTomorrow = tasks.find(task => !task.completed && task.due.toLowerCase() === "tomorrow");
  const urgentSubject = subjects.find(subject => subject.urgent) || subjects[0];
  const todayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][today.getDay()];
  const todayClasses = classes.filter(cls => cls.day === todayName).sort((a, b) => a.start.localeCompare(b.start));
  const displayedClasses = todayClasses.length ? todayClasses : [];
  const nextClass = todayClasses[0] || classes.find(c => ["MON", "TUE", "WED", "THU", "FRI"].includes(c.day)) || classes[0];
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const profileName = useTimelyStore.getState().preferences.profileName || "Alex";

  return (
    <div>
      {/* ---- Page heading ---- */}
      <div className="page-heading hero-heading">
        <div>
          <p className="eyebrow"><span className="live-pulse" /> {dateLabel}</p>
          <h1>{greeting}, {profileName} <span className="wave">{"\u2726"}</span></h1>
          <p className="heading-subtitle">Here{"\u2019"}s the shape of your day. Keep it light, keep moving.</p>
        </div>
        <div className="heading-actions">
          <button className="text-button" onClick={() => onNavigate("schedule")}>
            <span className="material-symbols-outlined">today</span>Today
          </button>
          <button className="primary-button" onClick={() => onOpenQuickAdd("task")}>
            <span className="material-symbols-outlined">add</span>Quick add
          </button>
        </div>
      </div>

      {/* ---- AI Briefing strip ---- */}
      <div className="briefing-strip paper-card">
        <div className="briefing-icon"><span className="material-symbols-outlined">lightbulb</span></div>
        <div className="briefing-copy">
          <span className="section-kicker">Your AI briefing</span>
          {briefingLoading ? (
            <p style={{ opacity: 0.6 }}>Generating your briefing…</p>
          ) : briefing ? (
            <p>{briefing}</p>
          ) : (
            <p>
              {dueTomorrow ? <><strong>{dueTomorrow.title}</strong> is due tomorrow. A 25-minute focus block today keeps it moving.</> : <>Your tasks are clear for tomorrow. Use a 25-minute focus block to stay ahead.</>}
            </p>
          )}
        </div>
        <button className="arrow-button" onClick={() => onNavigate("assistant")} aria-label="Open briefing">
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>

      {/* ---- Dashboard grid ---- */}
      <div className="dashboard-grid">
        <div className="left-column">
          {/* Timeline section */}
          <div className="section-header">
            <div>
              <span className="section-kicker">On the desk</span>
              <h2>Today{"\u2019"}s timeline</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("schedule")}>
              Full schedule <span className="material-symbols-outlined">arrow_outward</span>
            </button>
          </div>

          <div className="timeline paper-card">
            <div className="timeline-now"><span>NOW</span><i /></div>

            {displayedClasses.length > 0 ? (
              displayedClasses.slice(0, 3).map((cls, index) => (
                <article key={cls.id} className={`timeline-row ${index === 0 ? "past" : index === 1 ? "current" : ""}`}>
                  <time>{cls.start}</time>
                  <div className="timeline-line" />
                  <div className={`event-card event-${cls.color}`}>
                    <div className="event-top">
                      <span className="event-type">{index === 1 ? "UP NEXT" : cls.imported ? "IMPORTED" : "CLASS"} · {cls.room}</span>
                      {index === 0 ? <span className="event-check"><span className="material-symbols-outlined">check</span></span> : index === 1 ? <span className="event-live">Next up</span> : <span className="event-type">{cls.day}</span>}
                    </div>
                    <h3>{cls.subject}</h3>
                    <p>{cls.teacher} · {cls.room}</p>
                    <div className="event-footer">
                      <span>{cls.start} — {cls.end}</span>
                      <span className="event-avatar">{cls.teacher.split(" ").map(part => part[0]).join("").slice(0, 2)}</span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <article className="timeline-row">
                <time>{hour < 12 ? "09:00" : hour < 14 ? "13:00" : "16:00"}</time>
                <div className="timeline-line" />
                <div className="free-block" style={{ textAlign: "center", padding: "1.5rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "2rem", opacity: 0.5 }}>event_available</span>
                  <div style={{ marginTop: "0.5rem" }}>
                    <strong>No classes today</strong>
                    <p style={{ marginTop: "0.25rem", opacity: 0.7 }}>Enjoy your free day! Add a class in Schedule if needed.</p>
                  </div>
                </div>
              </article>
            )}

            <article className="timeline-row">
              <time>14:00</time>
              <div className="timeline-line dashed" />              <div className="free-block">
                <span className="material-symbols-outlined">coffee</span>
                <div>
                  <strong>Open space</strong>
                  <p>{dueTomorrow ? `Good window for ${dueTomorrow.title}` : "Good window for a focused study block"}</p>
                </div>
                <button className="text-button" onClick={() => onOpenQuickAdd("task")}>Plan focus</button>
              </div>
            </article>
          </div>

          {/* Tasks section */}
          <div className="section-header tasks-header">
            <div>
              <span className="section-kicker">Before you forget</span>
              <h2>Tasks to keep in orbit</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("academics")}>
              View all <span className="material-symbols-outlined">arrow_outward</span>
            </button>
          </div>

          <div className="task-list paper-card">
            {tasks.map(task => (
              <label key={task.id} className={"task-row" + (task.completed ? " completed-task" : "")}>
                <input type="checkbox" className="task-checkbox" checked={task.completed} onChange={() => onTaskToggle(task.id)} />
                <span className="fake-checkbox"><span className="material-symbols-outlined">check</span></span>
                <span className="task-main">
                  <strong>{task.title}</strong>
                  <small>
                    <span className={"subject-dot " + subjectDot(task.subject)} />{task.subject}
                    <span className="task-separator"> · </span>
                    due {task.due}
                  </small>
                </span>
                <span className="task-time">{task.time}</span>
                <span className={"priority " + priorityClass(task.priority)}>
                          {task.completed ? "Done" : task.priority === "high" ? "High" : task.priority === "medium" ? "Med" : "Low"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Right column */}
        <aside className="right-column">
          <div className="section-header compact">
            <div>
              <span className="section-kicker">Keep an eye on</span>
              <h2>Coming up</h2>
            </div>
            <button className="icon-button small"><span className="material-symbols-outlined">more_horiz</span></button>
          </div>
          <div className="upcoming-stack">
            <article className="upcoming-card exam-card paper-card">
              <div className="tape" />
              <div className="upcoming-icon red-icon"><span className="material-symbols-outlined">school</span></div>
              <div className="upcoming-copy">
                <span className="event-type">EXAM · {urgentSubject?.tag || "TRACKED"}</span>
                <h3>{urgentSubject ? `${urgentSubject.name} midterm` : "No exam tracked"}</h3>
                <p>{urgentSubject?.tag || "Add an exam to track preparation"} <span className="tiny-divider" /> {urgentSubject?.preparedness || 0}% prepared</p>
                <div className="progress-track"><span style={{width: `${urgentSubject?.preparedness || 0}%`}} /></div>
              </div>
              <button className="mini-more"><span className="material-symbols-outlined">arrow_forward</span></button>
            </article>
            <article className="upcoming-card meeting-card paper-card">
              <div className="upcoming-icon blue-icon"><span className="material-symbols-outlined">groups</span></div>
              <div className="upcoming-copy">
                <span className="event-type">NEXT CLASS · {nextClass?.day || "TBD"} {nextClass?.start || ""}</span>
                <h3>{nextClass?.subject || "No class tracked"}</h3>
                <p>{nextClass ? `${nextClass.teacher} · ${nextClass.room}` : "Add a class to see it here"}</p>
              </div>
              <button className="mini-more"><span className="material-symbols-outlined">arrow_forward</span></button>
            </article>
          </div>

          {/* Focus card — working Pomodoro timer */}
          <PomodoroTimer p={pomodoro} />

          {/* Quote card */}
          <div className="quote-card">
            <span className="quote-mark">{"\u201c"}</span>
            <p>Do what you can, with what you have, where you are.</p>
            <small>{"\u2014"} Theodore Roosevelt</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
