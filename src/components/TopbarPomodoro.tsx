"use client";

import React from "react";
import type { PomodoroState } from "@/lib/usePomodoro";

export default function TopbarPomodoro({ p }: { p: PomodoroState }) {
  const { mode, running, mins, secs, isBreak, startPause, skipBreak, sessions } = p;

  const dotColor = isBreak ? "#2d8a6e" : "#c53b40";
  const label = isBreak ? "Break" : "Focus";

  // Always show the pomodoro widget — users should always see their progress/session count
  if (!true) return null;

  return (
    <div className="topbar-pomodoro">
      <span className="topbar-pom-dot" style={{ background: dotColor }} />
      <span className="topbar-pom-label">{label}</span>
      <span className="topbar-pom-time">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      <button className="topbar-pom-btn" onClick={startPause} aria-label={running ? "Pause" : "Resume"}>
        <span className="material-symbols-outlined">{running ? "pause" : "play_arrow"}</span>
      </button>
      {isBreak && running && (
        <button className="topbar-pom-btn" onClick={skipBreak} aria-label="Skip break" title="Skip break">
          <span className="material-symbols-outlined">skip_next</span>
        </button>
      )}
    </div>
  );
}
