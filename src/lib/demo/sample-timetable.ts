/**
 * DEMO CONTENT — not application data.
 *
 * This is a fictional timetable used only when a user deliberately clicks
 * "Use a sample timetable to preview the magic" in the Import dialog. It is
 * never seeded into an account, never returned as a fallback, and never read
 * by a production code path. Anything a user imports from here is marked as a
 * sample so it stays distinguishable from their real data.
 */

import type { ClassEvent } from "@/lib/types";

export const SAMPLE_TIMETABLE: ClassEvent[] = [
  { id: "sample-eng", subject: "Sample · English", teacher: "Sample teacher", room: "B14", day: "TUE", start: "08:30", end: "09:45", color: "lilac", checked: true },
  { id: "sample-calc", subject: "Sample · Calculus", teacher: "Sample teacher", room: "C02", day: "TUE", start: "10:00", end: "11:15", color: "blue", checked: true },
  { id: "sample-art", subject: "Sample · Art", teacher: "Sample teacher", room: "Studio 3", day: "TUE", start: "11:30", end: "13:00", color: "green", checked: true },
  { id: "sample-history", subject: "Sample · History", teacher: "Sample teacher", room: "A21", day: "WED", start: "14:00", end: "15:15", color: "yellow", checked: true },
  { id: "sample-bio", subject: "Sample · Biology", teacher: "Sample teacher", room: "Lab 2", day: "THU", start: "09:00", end: "10:15", color: "blue", checked: true },
];

export const SAMPLE_IMPORT_SOURCE = "Sample timetable (demo preview)";

/** Build checked, importable class rows from the sample timetable. */
export function buildSampleClasses(): ClassEvent[] {
  return SAMPLE_TIMETABLE.map((cls) => ({
    ...cls,
    id: `sample-${cls.id}-${Date.now()}`,
    imported: true,
    checked: true,
  }));
}
