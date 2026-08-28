export interface ClassEvent {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  day: string;
  start: string;
  end: string;
  color: "lilac" | "blue" | "green" | "yellow" | "red";
  checked?: boolean;
  imported?: boolean;
  googleCalendarId?: string;
  allDay?: boolean;
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  due: string;
  time: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  custom?: boolean;
  notes?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacher: string;
  room: string;
  symbol: string;
  color: "blue" | "lilac" | "green" | "yellow";
  preparedness: number;
  tasksDue: number;
  tag?: string;
  urgent?: boolean;
}

export interface Note {
  id: string;
  subject: string;
  ago: string;
  title: string;
  preview: string;
  color: "yellow" | "blue" | "lilac" | "green" | "red";
  pinned?: boolean;
  hasAiSummary?: boolean;
  body?: string;
  footer?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: "pdf" | "doc" | "img";
  subject: string;
  updated: string;
  size: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  user: boolean;
  timestamp?: number;
}

export interface SavedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AiConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface Preferences {
  notifications: boolean;
  theme: "paper" | "dark" | "light";
  reduceMotion: boolean;
  profileName: string;
}

export interface NotificationItem {
  id: string;
  tone: "red" | "blue" | "yellow" | "green";
  icon: string;
  title: string;
  detail: string;
  read: boolean;
}

export type ViewName =
  | "home"
  | "schedule"
  | "academics"
  | "assistant"
  | "notes"
  | "files"
  | "analytics"
  | "profile";

export type AddType = "task" | "event" | "note" | "exam";

export type ScheduleTab = "week" | "day" | "agenda";
export type AcademicFilter = "all" | "active" | "attention";
