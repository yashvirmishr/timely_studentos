"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTimelyStore } from "./store";
import { scopedKey } from "./user-scope";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
/** Storage is namespaced per user id: `timely_pomodoro:<userId>`. */
const STORAGE_KEY_BASE = "timely_pomodoro";

export interface SessionData {
  today: number;
  total: number;
  date: string;
  lastCompletedAt: number | null;
}

export type PomodoroMode = "idle" | "work" | "break";

export interface PomodoroState {
  mode: PomodoroMode;
  secondsLeft: number;
  running: boolean;
  sessions: SessionData;
  mins: number;
  secs: number;
  isBreak: boolean;
  isWork: boolean;
  isIdle: boolean;
  isFinished: boolean;
  totalSeconds: number;
  startPause: () => Promise<void>;
  reset: () => void;
  skipBreak: () => void;
}

export function emptySessions(): SessionData {
  return { today: 0, total: 0, date: "", lastCompletedAt: null };
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function loadSessions(storageKey: string): SessionData {
  if (typeof window === "undefined") return emptySessions();
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return { ...emptySessions(), ...JSON.parse(raw) };
  } catch {}
  return emptySessions();
}

function saveSessions(storageKey: string, data: SessionData) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {}
}

const hasNotificationApi = typeof window !== "undefined" && "Notification" in window;

function notify(title: string, body: string) {
  if (!hasNotificationApi || Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "/favicon.ico", tag: "pomodoro" }); } catch {}
}

async function requestPermission(): Promise<boolean> {
  if (!hasNotificationApi) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function usePomodoro(): PomodoroState {
  const userId = useTimelyStore((state) => state.userId);
  const storageKey = scopedKey(STORAGE_KEY_BASE, userId);

  const [mode, setMode] = useState<PomodoroMode>("idle");
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<SessionData>(() => loadSessions(storageKey));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef(false);

  const isBreak = mode === "break";
  const isWork = mode === "work";
  const isIdle = mode === "idle";
  const totalSeconds = isBreak ? BREAK_SECONDS : WORK_SECONDS;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isFinished = secondsLeft === 0 && !running;

  // Reload when the account changes so one user never reads another's counts.
  useEffect(() => {
    setSessions(loadSessions(storageKey));
    setRunning(false);
    setMode("idle");
    setSecondsLeft(WORK_SECONDS);
  }, [storageKey]);

  // Daily reset
  useEffect(() => {
    const today = todayKey();
    setSessions(prev => {
      if (prev.date !== today) {
        const updated = { ...prev, today: 0, date: today };
        saveSessions(storageKey, updated);
        return updated;
      }
      return prev;
    });
  }, [storageKey]);

  // Timer tick
  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Timer completion
  useEffect(() => {
    if (secondsLeft !== 0 || !running) return;
    setRunning(false);

    if (isWork) {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        notify(
          "\uD83C\uDF45 Pomodoro complete!",
          `25-minute focus session finished. You've completed ${sessions.today + 1} session${sessions.today + 1 !== 1 ? "s" : ""} today. Time for a break!`
        );
      }
      setSessions(prev => {
        const updated: SessionData = { today: prev.today + 1, total: prev.total + 1, date: todayKey(), lastCompletedAt: Date.now() };
        saveSessions(storageKey, updated);
        return updated;
      });
      setMode("break");
      setSecondsLeft(BREAK_SECONDS);
      setRunning(true);
      notifiedRef.current = false;
    } else if (isBreak) {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        notify("\u2615 Break's over!", "Your 5-minute break is done. Ready for another focus session?");
      }
      setMode("idle");
      setSecondsLeft(WORK_SECONDS);
    }
  }, [secondsLeft, running, isWork, isBreak, sessions.today, storageKey]);

  const startPause = useCallback(async () => {
    if (isIdle) {
      notifiedRef.current = false;
      setMode("work");
      setSecondsLeft(WORK_SECONDS);
      setRunning(true);
      await requestPermission();
      return;
    }
    if (secondsLeft === 0 && isBreak) {
      notifiedRef.current = false;
      setMode("work");
      setSecondsLeft(WORK_SECONDS);
      setRunning(true);
      await requestPermission();
      return;
    }
    setRunning(prev => !prev);
  }, [secondsLeft, isIdle, isBreak]);

  const reset = useCallback(() => {
    setRunning(false);
    setMode("idle");
    setSecondsLeft(WORK_SECONDS);
  }, []);

  const skipBreak = useCallback(() => {
    setRunning(false);
    setMode("idle");
    setSecondsLeft(WORK_SECONDS);
  }, []);

  return {
    mode, secondsLeft, running, sessions,
    mins, secs, isBreak, isWork, isIdle, isFinished, totalSeconds,
    startPause, reset, skipBreak,
  };
}
