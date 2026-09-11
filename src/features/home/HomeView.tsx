"use client";

import React, { useState, useEffect } from "react";
import PomodoroTimer from "@/components/PomodoroTimer";
import type { ViewName, AddType, Task, ClassEvent, Subject } from "@/lib/types";
import { useTimelyStore } from "@/lib/store";
import type { PomodoroState } from "@/lib/usePomodoro";

const QUOTES: [string, string][] = [
  ["Do what you can, with what you have, where you are.", "Theodore Roosevelt"],
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["It always seems impossible until it's done.", "Nelson Mandela"],
  ["Education is the most powerful weapon which you can use to change the world.", "Nelson Mandela"],
  ["The beautiful thing about learning is that nobody can take it away from you.", "B.B. King"],
  ["Start where you are. Use what you have. Do what you can.", "Arthur Ashe"],
  ["The only way to do great work is to love what you do.", "Steve Jobs"],
  ["Don't let yesterday take up too much of today.", "Will Rogers"],
  ["We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "Aristotle"],
  ["The expert in anything was once a beginner.", "Helen Hayes"],
  ["Believe you can and you're halfway there.", "Theodore Roosevelt"],
  ["You don't have to be great to start, but you have to start to be great.", "Zig Ziglar"],
  ["The mind is not a vessel to be filled, but a fire to be kindled.", "Plutarch"],
  ["Discipline is the bridge between goals and accomplishment.", "Jim Rohn"],
  ["What we know is a drop, what we don't know is an ocean.", "Isaac Newton"],
  ["The only limit to our realization of tomorrow will be our doubts of today.", "Franklin D. Roosevelt"],
  ["Quality is not an act, it is a habit.", "Aristotle"],
  ["Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", "Stephen King"],
  ["The best time to plant a tree was 20 years ago. The second best time is now.", "Chinese Proverb"],
  ["Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill"],
];

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
  onEnterFocusMode?: () => void;
}

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map((part) => parseInt(part, 10));
  if (Number.isNaN(hours)) return Number.NaN;
  return hours * 60 + (Number.isNaN(minutes) ? 0 : minutes);
}

/** Dot colour follows the subject's own colour; unknown subjects stay neutral. */
function subjectDotClass(subjectName: string, subjects: Subject[]): string {
  const subject = subjects.find((item) => item.name === subjectName);
  if (!subject) return "dot-neutral";
  return `dot-${subject.color}`;
}

export default function HomeView({
  onNavigate,
  onOpenQuickAdd,
  tasks,
  classes,
  subjects,
  onTaskToggle,
  pomodoro,
  briefing,
  briefingLoading,
  onGenerateBriefing,
  onEnterFocusMode,
}: HomeViewProps) {
  const profileName = useTimelyStore((state) => state.preferences.profileName);
  const aiEnabled = useTimelyStore((state) => state.aiConfig.enabled);

  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));
    const timer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % QUOTES.length);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const priorityClass = (p: string) =>
    p === "high" ? "high" : p === "medium" ? "medium" : "low";

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const todayName = DAY_CODES[today.getDay()];
  const todayClasses = classes
    .filter((cls) => cls.day === todayName)
    .sort((a, b) => a.start.localeCompare(b.start));

  const openTasks = tasks.filter((task) => !task.completed);
  const dueTomorrow = openTasks.find(
    (task) => task.due.toLowerCase() === "tomorrow",
  );
  const trackedExam = subjects.find((subject) => subject.urgent);

  // "Next up" is derived from the clock, never from list position.
  const nextClassToday = todayClasses.find(
    (cls) => toMinutes(cls.end) >= nowMinutes,
  );
  const nextClass = nextClassToday || classes[0];

  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetingName = profileName.trim().split(" ")[0];

  const classStatus = (cls: ClassEvent): "past" | "current" | "upcoming" => {
    const start = toMinutes(cls.start);
    const end = toMinutes(cls.end);
    if (Number.isNaN(start) || Number.isNaN(end)) return "upcoming";
    if (end <= nowMinutes) return "past";
    if (start <= nowMinutes) return "current";
    return "upcoming";
  };

  return (
    <div>
      {/* ---- Page heading ---- */}
      <div className="page-heading hero-heading">
        <div>
          <p className="eyebrow"><span className="live-pulse" /> {dateLabel}</p>
          <h1>
            {greeting}
            {greetingName ? `, ${greetingName}` : ""}{" "}
            <span className="wave">{"\u2726"}</span>
          </h1>
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

      {/* ---- AI briefing strip ---- */}
      <div className="briefing-strip paper-card">
        <div className="briefing-icon"><span className="material-symbols-outlined">lightbulb</span></div>
        <div className="briefing-copy">
          <span className="section-kicker">Your AI briefing</span>
          {briefingLoading ? (
            <p style={{ opacity: 0.6 }}>Generating your briefing…</p>
          ) : briefing ? (
            <p>{briefing}</p>
          ) : tasks.length === 0 && classes.length === 0 ? (
            <p>
              Nothing on your plate yet — add a class or a task and your briefing
              will summarize it.
            </p>
          ) : dueTomorrow ? (
            <p>
              <strong>{dueTomorrow.title}</strong> is due tomorrow. A 25-minute focus block today keeps it moving.
            </p>
          ) : (
            <p>
              {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
              {todayClasses.length > 0
                ? ` and ${todayClasses.length} class${todayClasses.length === 1 ? "" : "es"} today`
                : " today"}.
              {aiEnabled
                ? " Generate a briefing for the full picture."
                : " Enable Gemini in Profile for a written briefing."}
            </p>
          )}
        </div>
        {onGenerateBriefing && aiEnabled && (tasks.length > 0 || classes.length > 0) && (
          <button
            className="arrow-button"
            onClick={onGenerateBriefing}
            aria-label="Generate briefing"
          >
            <span className="material-symbols-outlined">auto_awesome</span>
          </button>
        )}
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
            {todayClasses.length > 0 ? (
              <>
                <div className="timeline-now"><span>NOW</span><i /></div>
                {todayClasses.map((cls) => {
                  const status = classStatus(cls);
                  return (
                    <article
                      key={cls.id}
                      className={`timeline-row ${status === "past" ? "past" : status === "current" ? "current" : ""}`}
                    >
                      <time>{cls.start}</time>
                      <div className="timeline-line" />
                      <div className={`event-card event-${cls.color}`}>
                        <div className="event-top">
                          <span className="event-type">
                            {status === "current" ? "UP NEXT" : cls.imported ? "IMPORTED" : "CLASS"} · {cls.room}
                          </span>
                          {status === "past" ? (
                            <span className="event-check"><span className="material-symbols-outlined">check</span></span>
                          ) : status === "current" ? (
                            <span className="event-live">Happening now</span>
                          ) : (
                            <span className="event-type">{cls.day}</span>
                          )}
                        </div>
                        <h3>{cls.subject}</h3>
                        <p>{cls.teacher} · {cls.room}</p>
                        <div className="event-footer">
                          <span>{cls.start} — {cls.end}</span>
                          <span className="event-avatar">
                            {cls.teacher.split(" ").map((part) => part[0]).filter(Boolean).join("").slice(0, 2)}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </>
            ) : (
              <div className="empty-state">
                <span className="material-symbols-outlined">event_available</span>
                <strong>No classes today</strong>
                <p>
                  {classes.length === 0
                    ? "Add your first class and it will show up here."
                    : `Nothing scheduled for ${todayName.toLowerCase()} — enjoy the space.`}
                </p>
                <button className="text-button" onClick={() => onOpenQuickAdd("event")}>
                  Add a class
                </button>
              </div>
            )}
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
            {tasks.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">task_alt</span>
                <strong>No tasks in orbit</strong>
                <p>Add a small next step to get moving.</p>
                <button className="text-button" onClick={() => onOpenQuickAdd("task")}>
                  Create your first task
                </button>
              </div>
            ) : (
              tasks.map((task) => (
                <label key={task.id} className={"task-row" + (task.completed ? " completed-task" : "")}>
                  <input type="checkbox" className="task-checkbox" checked={task.completed} onChange={() => onTaskToggle(task.id)} />
                  <span className="fake-checkbox"><span className="material-symbols-outlined">check</span></span>
                  <span className="task-main">
                    <strong>{task.title}</strong>
                    <small>
                      <span className={"subject-dot " + subjectDotClass(task.subject, subjects)} />{task.subject}
                      <span className="task-separator"> · </span>
                      due {task.due}
                    </small>
                  </span>
                  <span className="task-time">{task.time}</span>
                  <span className={"priority " + priorityClass(task.priority)}>
                    {task.completed ? "Done" : task.priority === "high" ? "High" : task.priority === "medium" ? "Med" : "Low"}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <aside className="right-column">
          <div className="section-header compact">
            <div>
              <span className="section-kicker">Keep an eye on</span>
              <h2>Coming up</h2>
            </div>
            <button className="icon-button small" onClick={() => onNavigate("academics")} aria-label="Open academics">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
          <div className="upcoming-stack">
            {trackedExam ? (
              <article className="upcoming-card exam-card paper-card">
                <div className="tape" />
                <div className="upcoming-icon red-icon"><span className="material-symbols-outlined">school</span></div>
                <div className="upcoming-copy">
                  <span className="event-type">EXAM · {trackedExam.tag || "TRACKED"}</span>
                  <h3>{trackedExam.name}</h3>
                  <p>
                    {trackedExam.teacher || "No teacher set"}
                    <span className="tiny-divider" /> {trackedExam.preparedness || 0}% prepared
                  </p>
                  <div className="progress-track"><span style={{ width: `${trackedExam.preparedness || 0}%` }} /></div>
                </div>
                <button className="mini-more" onClick={() => onNavigate("academics")} aria-label="Open academics">
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </article>
            ) : (
              <article className="upcoming-card paper-card">
                <div className="upcoming-icon red-icon"><span className="material-symbols-outlined">school</span></div>
                <div className="upcoming-copy">
                  <span className="event-type">NO EXAM TRACKED</span>
                  <h3>Nothing marked urgent</h3>
                  <p>
                    {subjects.length === 0
                      ? "Add a subject to start tracking preparation."
                      : "Flag a subject as needing attention to track it here."}
                  </p>
                </div>
              </article>
            )}
            <article className="upcoming-card meeting-card paper-card">
              <div className="upcoming-icon blue-icon"><span className="material-symbols-outlined">groups</span></div>
              <div className="upcoming-copy">
                <span className="event-type">
                  {nextClassToday
                    ? `NEXT CLASS · ${nextClassToday.day} ${nextClassToday.start}`
                    : "NEXT CLASS"}
                </span>
                <h3>{nextClassToday ? nextClassToday.subject : nextClass ? nextClass.subject : "No class tracked"}</h3>
                <p>
                  {nextClassToday
                    ? `${nextClassToday.teacher} · ${nextClassToday.room}`
                    : nextClass
                      ? `${nextClass.day} ${nextClass.start} · ${nextClass.room}`
                      : "Add a class to see it here"}
                </p>
              </div>
              <button className="mini-more" onClick={() => onNavigate("schedule")} aria-label="Open schedule">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </article>
          </div>

          {/* Focus card — working Pomodoro timer */}
          <PomodoroTimer p={pomodoro} onEnterFocusMode={onEnterFocusMode} />

          {/* Quote card */}
          <div className="quote-card">
            <span className="quote-mark">{"\u201c"}</span>
            <p>{QUOTES[quoteIndex][0]}</p>
            <small>{"\u2014"} {QUOTES[quoteIndex][1]}</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
