"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { probeOnboarding } from "@/lib/supabase/sync";
import { schemaDriftMessage } from "@/lib/supabase/schema";
import { useTimelyStore } from "@/lib/store";
import type { Subject, ClassEvent, Preferences } from "@/lib/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIMES = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00",
];
const SUBJECT_COLORS: Subject["color"][] = ["blue", "lilac", "green", "yellow"];
const CLASS_COLORS: ClassEvent["color"][] = ["blue", "lilac", "green", "yellow", "red"];
const SYMBOLS = ["📐","📚","🎨","🧪","🌍","📖","🎵","🔬","📝","💻"];

interface SubjectDraft {
  name: string;
  teacher: string;
  room: string;
  color: Subject["color"];
  symbol: string;
}

interface ClassDraft {
  subjectIndex: number;
  day: string;
  start: string;
  end: string;
  room: string;
  color: ClassEvent["color"];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setPreferences, addSubject, addClass, setOnboarded, pushToSupabase } =
    useTimelyStore();
  const [step, setStep] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);
  // A failed "has this account finished setup?" check must never be read as
  // "not finished" — that is exactly how an account gets trapped on this screen.
  const [checkError, setCheckError] = useState<string | null>(null);
  const [columnMissing, setColumnMissing] = useState(false);

  // Step 1: Profile
  const [profileName, setProfileName] = useState("");
  const [theme, setTheme] = useState<Preferences["theme"]>("paper");

  // Step 2: Subjects
  const [subjects, setSubjects] = useState<SubjectDraft[]>([
    { name: "", teacher: "", room: "", color: "blue", symbol: "📐" },
  ]);

  // Step 3: Schedule
  const [classes, setClasses] = useState<ClassDraft[]>([]);

  // Check if already onboarded
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      // An account that already finished setup should never see this form
      // again — its source of truth is the profile row, not a browser flag.
      const probe = await probeOnboarding(session.user.id);

      if (probe.error) setCheckError(probe.error);
      setColumnMissing(!probe.columnPresent);

      // Only a definitive "no" may keep the user here.
      if (probe.columnPresent && probe.onboarded) {
        router.replace("/");
        return;
      }
      setCheckingSession(false);
    });
  }, [router]);

  if (checkingSession) {
    return (
    <div className="onb-shell" data-theme={theme}>
        <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite", fontSize: 32, color: "#aaa79e" }}>
          progress_activity
        </span>
      </div>
    );
  }

  function addSubjectRow() {
    if (subjects.length >= 6) return;
    const nextColor = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    const nextSymbol = SYMBOLS[subjects.length % SYMBOLS.length];
    setSubjects([...subjects, { name: "", teacher: "", room: "", color: nextColor, symbol: nextSymbol }]);
  }

  function removeSubjectRow(idx: number) {
    setSubjects(subjects.filter((_, i) => i !== idx));
  }

  function updateSubject(idx: number, field: keyof SubjectDraft, value: string) {
    const next = [...subjects];
    (next[idx] as any)[field] = value;
    setSubjects(next);
  }

  function addClassRow() {
    setClasses([...classes, { subjectIndex: 0, day: "Monday", start: "09:00", end: "10:00", room: "", color: "blue" }]);
  }

  function removeClassRow(idx: number) {
    setClasses(classes.filter((_, i) => i !== idx));
  }

  function updateClass(idx: number, field: keyof ClassDraft, value: string | number) {
    const next = [...classes];
    (next[idx] as any)[field] = value;
    setClasses(next);
  }

  async function finishOnboarding() {
    // Save profile. An empty name stays empty — we never invent one.
    setPreferences({ profileName: profileName.trim(), theme });

    // Save subjects — blank rows are ignored, never invented.
    subjects.forEach((s) => {
      if (!s.name.trim()) return;
      addSubject({
        id: `subj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: s.name.trim(),
        teacher: s.teacher.trim() || "TBA",
        room: s.room.trim() || "TBA",
        symbol: s.symbol,
        color: s.color,
        preparedness: 0,
        tasksDue: 0,
      });
    });

    // Save classes
    classes.forEach((c) => {
      const subj = subjects[c.subjectIndex];
      addClass({
        id: `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        subject: subj?.name || "General",
        teacher: subj?.teacher || "TBA",
        room: c.room.trim() || subj?.room || "TBA",
        day: c.day,
        start: c.start,
        end: c.end,
        color: c.color,
      });
    });

    // Mark onboarding complete on the account itself, then write the whole
    // workspace so setup genuinely initializes the app rather than only
    // changing local state.
    setOnboarded(true);
    await pushToSupabase();
    router.replace("/");
  }

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="onb-shell" data-theme={theme}>
      {/* Background doodles */}
      <svg className="onb-bg-doodle onb-bg-doodle--1" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="60" cy="60" r="50" strokeDasharray="4 6"/>
        <path d="M40,60 L80,60 M60,40 L60,80"/>
        <path d="M35,35 Q60,20 85,35 Q100,60 85,85 Q60,100 35,85 Q20,60 35,35Z"/>
      </svg>
      <svg className="onb-bg-doodle onb-bg-doodle--2" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="15" y="15" width="70" height="70" rx="4" transform="rotate(12 50 50)"/>
        <line x1="25" y1="35" x2="75" y2="35"/>
        <line x1="25" y1="50" x2="65" y2="50"/>
        <line x1="25" y1="65" x2="55" y2="65"/>
      </svg>
      <svg className="onb-bg-doodle onb-bg-doodle--3" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M30,5 L35,22 L55,22 L39,33 L44,50 L30,40 L16,50 L21,33 L5,22 L25,22Z"/>
      </svg>
      <svg className="onb-bg-doodle onb-bg-doodle--4" viewBox="0 0 80 40" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M5,35 Q20,5 40,20 Q60,35 75,5" strokeLinecap="round"/>
      </svg>

      {/* Progress bar */}
      <div className="onb-progress-track">
        <div className="onb-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="onb-card onb-card-enter">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="onb-step onb-welcome">
            <div className="onb-welcome-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>school</span>
            </div>
            <h1 className="onb-welcome-title">Welcome to<br/><span className="onb-welcome-brand">Timely</span></h1>
            <p className="onb-welcome-sub">
              Your academic operating system.<br />
              Tasks, timetable, notes, and AI — all in one place.
            </p>

            <div className="onb-features">
              <div className="onb-feature">
                <div className="onb-feature-icon" style={{ background: "#e8f0fe" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#1a73e8" }}>calendar_month</span>
                </div>
                <div>
                  <strong>Timetable</strong>
                  <span>Plan your week at a glance</span>
                </div>
              </div>
              <div className="onb-feature">
                <div className="onb-feature-icon" style={{ background: "#fce8e6" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#c5221f" }}>task_alt</span>
                </div>
                <div>
                  <strong>Tasks</strong>
                  <span>Track assignments and deadlines</span>
                </div>
              </div>
              <div className="onb-feature">
                <div className="onb-feature-icon" style={{ background: "#e6f4ea" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#137333" }}>auto_awesome</span>
                </div>
                <div>
                  <strong>AI Assistant</strong>
                  <span>Smart suggestions for your day</span>
                </div>
              </div>
              <div className="onb-feature">
                <div className="onb-feature-icon" style={{ background: "#fef7e0" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#b05a00" }}>edit_note</span>
                </div>
                <div>
                  <strong>Notes</strong>
                  <span>Jot down ideas and summaries</span>
                </div>
              </div>
            </div>

            <button className="onb-btn-primary onb-welcome-btn" onClick={() => setStep(1)}>
              Get Started
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="onb-step">
            <div className="onb-step-num">1 of 3</div>
            <h2 className="onb-heading">What should we call you?</h2>
            <input
              className="onb-input"
              type="text"
              placeholder="Your name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              required
              autoFocus
            />

            <h2 className="onb-heading" style={{ marginTop: 24 }}>Pick a vibe</h2>
            <div className="onb-theme-row">
              {(["paper", "dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  className={`onb-theme-btn ${theme === t ? "active" : ""}`}
                  onClick={() => setTheme(t)}
                >
                  <span className="onb-theme-swatch" data-theme={t} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="onb-nav">
              <button className="onb-btn-secondary" onClick={() => setStep(0)}>Back</button>
              <button className="onb-btn-primary" onClick={() => setStep(2)} disabled={!profileName.trim()}>Next</button>
            </div>
          </div>
        )}

        {/* Step 2: Subjects */}
        {step === 2 && (
          <div className="onb-step">
            <div className="onb-step-num">2 of 3</div>
            <h2 className="onb-heading">Add your subjects</h2>
            <p className="onb-hint">Optional — skip it and add subjects whenever you like.</p>

            <div className="onb-subject-list">
              {subjects.map((s, i) => (
                <div key={i} className="onb-subject-row">
                  <div className="onb-subject-top">
                    <select
                      className="onb-symbol-select"
                      value={s.symbol}
                      onChange={(e) => updateSubject(i, "symbol", e.target.value)}
                    >
                      {SYMBOLS.map((sym) => (
                        <option key={sym} value={sym}>{sym}</option>
                      ))}
                    </select>
                    <input
                      className="onb-input onb-input--flex"
                      placeholder="Subject name"
                      value={s.name}
                      onChange={(e) => updateSubject(i, "name", e.target.value)}
                    />
                    <div className="onb-color-pick">
                      {SUBJECT_COLORS.map((c) => (
                        <button
                          key={c}
                          className={`onb-color-dot ${s.color === c ? "active" : ""}`}
                          data-color={c}
                          onClick={() => updateSubject(i, "color", c)}
                        />
                      ))}
                    </div>
                    {subjects.length > 1 && (
                      <button className="onb-remove-btn" onClick={() => removeSubjectRow(i)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                      </button>
                    )}
                  </div>
                  <div className="onb-subject-bottom">
                    <input
                      className="onb-input onb-input--sm"
                      placeholder="Teacher"
                      value={s.teacher}
                      onChange={(e) => updateSubject(i, "teacher", e.target.value)}
                    />
                    <input
                      className="onb-input onb-input--sm"
                      placeholder="Room"
                      value={s.room}
                      onChange={(e) => updateSubject(i, "room", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {subjects.length < 6 && (
              <button className="onb-add-btn" onClick={addSubjectRow}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                Add another subject
              </button>
            )}

            <div className="onb-nav">
              <button className="onb-btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="onb-btn-primary" onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="onb-step">
            <div className="onb-step-num">3 of 3</div>
            <h2 className="onb-heading">Set up your timetable</h2>
            <p className="onb-hint">Optional — add class times or skip to start using Timely.</p>

            <div className="onb-class-list">
              {classes.map((c, i) => (
                <div key={i} className="onb-class-row">
                  <select
                    className="onb-select"
                    value={c.subjectIndex}
                    onChange={(e) => updateClass(i, "subjectIndex", Number(e.target.value))}
                  >
                    {subjects.map((s, si) => (
                      <option key={si} value={si}>{s.symbol} {s.name || `Subject ${si + 1}`}</option>
                    ))}
                  </select>
                  <select
                    className="onb-select"
                    value={c.day}
                    onChange={(e) => updateClass(i, "day", e.target.value)}
                  >
                    {DAYS.map((d) => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
                  </select>
                  <select
                    className="onb-select"
                    value={c.start}
                    onChange={(e) => updateClass(i, "start", e.target.value)}
                  >
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="onb-time-dash">–</span>
                  <select
                    className="onb-select"
                    value={c.end}
                    onChange={(e) => updateClass(i, "end", e.target.value)}
                  >
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    className="onb-input onb-input--xs"
                    placeholder="Room"
                    value={c.room}
                    onChange={(e) => updateClass(i, "room", e.target.value)}
                  />
                  <div className="onb-color-pick">
                    {CLASS_COLORS.map((col) => (
                      <button
                        key={col}
                        className={`onb-color-dot ${c.color === col ? "active" : ""}`}
                        data-color={col}
                        onClick={() => updateClass(i, "color", col)}
                      />
                    ))}
                  </div>
                  <button className="onb-remove-btn" onClick={() => removeClassRow(i)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                </div>
              ))}
            </div>

            <button className="onb-add-btn" onClick={addClassRow}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Add a class
            </button>

            <div className="onb-nav">
              <button className="onb-btn-secondary" onClick={() => setStep(2)}>Back</button>
              <div className="onb-nav-right">
                <button className="onb-btn-ghost" onClick={finishOnboarding}>Skip</button>
                <button className="onb-btn-primary" onClick={finishOnboarding}>
                  Start using Timely
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
