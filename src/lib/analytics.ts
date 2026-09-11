/**
 * Pure analytics helpers.
 *
 * Every value here is derived from the user's own tasks and classes. There are
 * no fallbacks and no filler series — an empty workspace produces zeroes, and
 * the view renders an empty state instead of inventing numbers.
 */

import type { ClassEvent, Task } from "./types";

export const DAY_KEYS = ["MON", "TUE", "WED", "THU", "FRI"];
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday 00:00 — Sunday 23:59 of the week containing `reference`. */
export function getWeekRange(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(reference);
  const day = reference.getDay(); // 0 = Sunday
  start.setDate(reference.getDate() + (day === 0 ? -6 : 1 - day));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(reference: Date = new Date()): number {
  const day = reference.getDay();
  return day === 0 ? 6 : day - 1;
}

/** Per-day workload: classes scheduled plus open tasks due that day. */
export function getWorkloadData(
  tasks: Task[],
  classes: ClassEvent[],
  reference: Date = new Date(),
): number[] {
  const workload = [0, 0, 0, 0, 0, 0, 0];

  classes.forEach((cls) => {
    const index = DAY_KEYS.indexOf(cls.day);
    if (index >= 0) workload[index] += 1;
  });

  const today = weekdayIndex(reference);
  tasks.forEach((task) => {
    if (task.completed) return;
    const due = (task.due || "").toLowerCase().trim();
    if (due === "today") {
      workload[today] += 1;
      return;
    }
    if (due === "tomorrow") {
      workload[(today + 1) % 7] += 1;
      return;
    }
    const index = DAY_LABELS.findIndex((label) =>
      due.startsWith(label.toLowerCase()),
    );
    if (index >= 0) workload[index] += 1;
  });

  return workload;
}

/** Completion percentage, or null when there is nothing to measure. */
export function getCompletionRate(tasks: Task[]): number | null {
  if (tasks.length === 0) return null;
  const completed = tasks.filter((task) => task.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

/** Estimated study load in hours, from the user's own task estimates. */
export function getEstimatedStudyHours(tasks: Task[]): number {
  const minutes = tasks.reduce(
    (total, task) => total + (parseInt(task.time, 10) || 0),
    0,
  );
  return minutes / 60;
}
