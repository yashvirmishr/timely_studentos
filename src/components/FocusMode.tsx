"use client";

import React, { useEffect } from "react";
import type { PomodoroState } from "@/lib/usePomodoro";

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

export default function FocusMode({
  p,
  onClose,
}: {
  p: PomodoroState;
  onClose: () => void;
}) {
  const {
    mode,
    secondsLeft,
    running,
    sessions,
    mins,
    secs,
    isBreak,
    isWork,
    isIdle,
    isFinished,
    totalSeconds,
    startPause,
    reset,
    skipBreak,
  } = p;

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const circumference = 2 * Math.PI * 120;

  const accentColor = isBreak ? "#2d8a6e" : "#c53b40";
  const ringTrack = isBreak ? "rgba(45,138,110,0.15)" : "rgba(197,59,64,0.12)";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (isIdle && !isFinished) return null;

  return (
    <div className="focus-mode-overlay" data-theme="dark" style={{ willChange: "opacity" }}>
      <button className="focus-mode-close" onClick={onClose} aria-label="Exit focus mode">
        <span className="material-symbols-outlined">close</span>
      </button>

      <div className="focus-mode-content">
        <span className="focus-mode-kicker" style={{ color: isBreak ? "#5ecfa0" : "#ff8a8e" }}>
          {isBreak ? (running ? "Break time" : "Break done") : isWork ? (running ? "Focusing" : "Session done") : ""}
        </span>

        <div className="focus-mode-timer-ring">
          <svg viewBox="0 0 260 260">
            <circle
              cx="130" cy="130" r="120"
              fill="none"
              stroke={ringTrack}
              strokeWidth="6"
            />
            <circle
              cx="130" cy="130" r="120"
              fill="none"
              stroke={accentColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 130 130)"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
          <div className="focus-mode-time">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>

        <p className="focus-mode-subtitle" style={{ color: isBreak ? "#8ed4b8" : "#d4a0a2" }}>
          {isBreak
            ? running
              ? "Stand up. Look away from the screen."
              : `Break over — ${sessions.today} session${sessions.today !== 1 ? "s" : ""} done.`
            : running
              ? `${WORK_MINUTES - mins}m in — stay with it.`
              : `Great work! ${sessions.today} session${sessions.today !== 1 ? "s" : ""} completed.`
          }
        </p>

        <div className="focus-mode-controls">
          <button
            className="focus-mode-btn focus-mode-btn-primary"
            onClick={startPause}
            style={{ background: accentColor }}
          >
            <span className="material-symbols-outlined">
              {isIdle || (isFinished && isBreak) ? "play_arrow" : running ? "pause" : "replay"}
            </span>
            {isBreak && running ? "Pause break" : isBreak && isFinished ? "Start work" : isWork && running ? "Pause" : "Start session"}
          </button>

          {isBreak && running && (
            <button className="focus-mode-btn focus-mode-btn-ghost" onClick={skipBreak}>
              <span className="material-symbols-outlined">skip_next</span>
              Skip break
            </button>
          )}

          {!isFinished && (running || secondsLeft < totalSeconds) && !isBreak && (
            <button className="focus-mode-btn focus-mode-btn-ghost" onClick={reset}>
              <span className="material-symbols-outlined">restart_alt</span>
              Reset
            </button>
          )}
        </div>

        <div className="focus-mode-sessions">
          {sessions.today > 0 && (
            <span>{sessions.today} session{sessions.today !== 1 ? "s" : ""} today</span>
          )}
        </div>
      </div>
    </div>
  );
}
