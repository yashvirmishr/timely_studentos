"use client";

import React from "react";
import type { PomodoroState } from "@/lib/usePomodoro";

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;
const WORK_SECONDS = WORK_MINUTES * 60;
const BREAK_SECONDS = BREAK_MINUTES * 60;

export default function PomodoroTimer({ p }: { p: PomodoroState }) {
  const { mode, secondsLeft, running, sessions, mins, secs, isBreak, isWork, isIdle, isFinished, totalSeconds, startPause, reset, skipBreak } = p;
  const totalMinutes = isBreak ? BREAK_MINUTES : WORK_MINUTES;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const ringStroke = isBreak ? "#2d8a6e" : isWork ? "#c53b40" : "#4777aa";
  const ringTrack = isBreak ? "#cde5db" : "#d4dfe3";
  const cardBg = isBreak ? "#e9f5f0" : "#eff3f2";
  const headingColor = isBreak ? "#1d5c47" : "#345d66";
  const kickerColor = isBreak ? "#4a9d7c" : "#6f9699";
  const textColor = isBreak ? "#4d7a68" : "#6c8385";

  const scribbleLines = isBreak
    ? running ? ["stretch", "hydrate", "breathe"] : ["break", "complete!", "ready to go"]
    : isWork
    ? running ? ["stay", "focused", "keep going"] : ["pomodoro", "complete!", "take a break"]
    : sessions.today > 0
    ? [`${sessions.today} session${sessions.today !== 1 ? "s" : ""}`, "today", "good work"]
    : ["a little", "progress", "counts"];

  const circumference = (2 * Math.PI * 34).toFixed(2);

  return (
    <div className="focus-card paper-card" style={{ background: cardBg }}>
      <div className="focus-scribble">
        {scribbleLines[0]}<br/>{scribbleLines[1]}<br/>{scribbleLines[2]}
      </div>

      <div className="focus-content">
        <span className="section-kicker" style={{ color: kickerColor }}>
          {isBreak ? (running ? "Break time" : "Break done") : isWork ? (running ? "Focusing" : "Session done") : "Study focus"}
        </span>

        <h2 className="pomodoro-time" style={{
          fontVariantNumeric: "tabular-nums" as any,
          color: headingColor,
          opacity: isFinished && !isBreak ? 0.5 : 1,
        }}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </h2>

        <div className="pomodoro-ring" style={{ "--progress": progress } as React.CSSProperties}>
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke={ringTrack} strokeWidth="5" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={isFinished && isBreak ? "#73a57e" : ringStroke}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={(parseFloat(circumference) * (1 - progress)).toFixed(2)}
              transform="rotate(-90 40 40)"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
          <span className="pomodoro-session-label">
            {isFinished && isBreak ? "\u2713" : `${totalMinutes - mins < 1 ? "<1" : totalMinutes - mins}m`}
          </span>
        </div>

        <p style={{ color: textColor }}>
          {isBreak
            ? running
              ? `${BREAK_MINUTES - mins}m ${BREAK_MINUTES - mins === 1 ? "has" : "have"} passed \u2014 stand up, look away from the screen.`
              : `Break complete! ${sessions.today} session${sessions.today !== 1 ? "s" : ""} done today. Ready to go again?`
            : isWork
            ? running
              ? `${WORK_MINUTES - mins}m ${WORK_MINUTES - mins === 1 ? "has" : "have"} passed \u2014 stay with it.`
              : `Great work! ${sessions.today} session${sessions.today !== 1 ? "s" : ""} completed today.`
            : `${WORK_MINUTES}-minute focus block. You\u2019ve done ${sessions.today} today.`
          }
        </p>

        <div className="pomodoro-controls">
          <button
            className="dark-button"
            onClick={startPause}
            style={isBreak ? { background: "#2d8a6e", borderColor: "#1d5c47" } : {}}
          >
            <span className="material-symbols-outlined">
              {isIdle || (isFinished && isBreak) ? "play_arrow" : running ? "pause" : "replay"}
            </span>
            {isBreak && running ? "Pause break" : isBreak && isFinished ? "Start work" : isWork && running ? "Pause" : "Start a session"}
          </button>
          {isBreak && running && (
            <button className="text-button" onClick={skipBreak} style={{ marginLeft: 8 }}>
              <span className="material-symbols-outlined">skip_next</span>Skip break
            </button>
          )}
          {!isFinished && (running || secondsLeft < totalSeconds) && !isBreak && (
            <button className="text-button" onClick={reset} style={{ marginLeft: 8 }}>
              <span className="material-symbols-outlined">restart_alt</span>Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
