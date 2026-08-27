import type { ClassEvent } from "./types";

export const VIEW_NAMES: Record<string, string> = {
  home: "Home",
  schedule: "Schedule",
  academics: "Academics",
  assistant: "Study chat",
  notes: "Notes",
  files: "Files",
  analytics: "Analytics",
  profile: "Profile",
};

export const TIMETABLE_SEED: ClassEvent[] = [
  { id: "eng", subject: "English Literature", teacher: "Jamie Morgan", room: "B14", day: "TUE", start: "08:30", end: "09:45", color: "lilac", checked: true },
  { id: "calc", subject: "Advanced Calculus", teacher: "Dr. Mei Chen", room: "C02", day: "TUE", start: "10:00", end: "11:15", color: "blue", checked: true },
  { id: "art", subject: "Art & Design", teacher: "Sofia Kim", room: "Studio 3", day: "TUE", start: "11:30", end: "13:00", color: "green", checked: true },
  { id: "history", subject: "World History", teacher: "Priya Shah", room: "A21", day: "WED", start: "14:00", end: "15:15", color: "yellow", checked: true },
  { id: "bio", subject: "Biology", teacher: "Ravi Patel", room: "Lab 2", day: "THU", start: "09:00", end: "10:15", color: "blue", checked: true },
  { id: "counsel", subject: "University counselling", teacher: "Student Services", room: "A03", day: "THU", start: "16:00", end: "16:45", color: "red", checked: true },
];

export function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

export function getAssistantReply(text: string): string {
  const n = text.toLowerCase();
  if (n.includes("due") || n.includes("deadline"))
    return "Tomorrow is your History essay introduction. It is marked high priority and Timely estimates 45 minutes.";
  if (n.includes("study") || n.includes("time"))
    return "You have a 90-minute open window from 14:00 today. I'd reserve 25 minutes for the History introduction, then take a proper break.";
  if (n.includes("room") || n.includes("calculus"))
    return "Advanced Calculus is next at 10:00 in Room C02 with Dr. Mei Chen.";
  return "I'm looking at your timetable and tasks now. The kindest next step is a small, focused block — want me to shape one for you?";
}
