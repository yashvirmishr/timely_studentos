"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const STORAGE_KEY = "timely_pomodoro";

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

function loadSessions(): SessionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { today: 0, total: 0, date: "", lastCompletedAt: null };
}

function saveSessions(data: SessionData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
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
  const [mode, setMode] = useState<PomodoroMode>("idle");
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<SessionData>(loadSessions);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedRef = useRef(false);

  const isBreak = mode === "break";
  const isWork = mode === "work";
  const isIdle = mode === "idle";
  const totalSeconds = isBreak ? BREAK_SECONDS : WORK_SECONDS;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isFinished = secondsLeft === 0 && !running;

  // Daily reset
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSessions(prev => {
      if (prev.date !== today) {
        const updated = { ...prev, today: 0, date: today };
        saveSessions(updated);
        return updated;
      }
      return prev;
    });
  }, []);

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
        const today = new Date().toISOString().slice(0, 10);
        const updated: SessionData = { today: prev.today + 1, total: prev.total + 1, date: today, lastCompletedAt: Date.now() };
        saveSessions(updated);
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
  }, [secondsLeft, running, isWork, isBreak, sessions.today]);

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
