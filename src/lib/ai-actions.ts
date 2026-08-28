/**
 * AI Actions — parse structured action blocks from AI responses,
 * detect smart student intents, and execute actions against the store.
 */

import type {
  PendingAiAction,
  AiActionType,
  Task,
  Note,
  ClassEvent,
} from "./types";

// ─── Action Block Format ────────────────────────────────────────────
// The AI can emit blocks like:
//   [ACTION:CREATE_TASK:{"title":"Math homework","due":"2024-12-20","subject":"Math"}]
// Multiple action blocks are allowed per response.
// ────────────────────────────────────────────────────────────────────

const ACTION_BLOCK_RE = /\[ACTION:(\w+):(\{[^}]+\})\]/g;

export interface ParsedActions {
  /** Clean text with action blocks stripped out */
  cleanText: string;
  /** Parsed pending actions */
  actions: PendingAiAction[];
}

/** Parse action blocks from an AI response string. */
export function parseActionsFromResponse(text: string): ParsedActions {
  const actions: PendingAiAction[] = [];
  let cleanText = text;

  let match: RegExpExecArray | null;
  while ((match = ACTION_BLOCK_RE.exec(text)) !== null) {
    const type = match[1] as AiActionType;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(match[2]);
    } catch {
      continue; // malformed JSON — skip this block
    }

    const label = actionLabel(type, payload);
    actions.push({
      id: `ai-action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label,
      payload,
      rawText: text,
    });
    cleanText = cleanText.replace(match[0], "").trim();
  }

  // Clean up extra whitespace left after stripping blocks
  cleanText = cleanText.replace(/\n{3,}/g, "\n\n").trim();

  return { cleanText, actions };
}

function actionLabel(
  type: AiActionType,
  payload: Record<string, unknown>,
): string {
  switch (type) {
    case "CREATE_TASK":
      return `Create task: ${payload.title || "New task"}`;
    case "UPDATE_TASK":
      return `Update task: ${payload.title || "Task"}`;
    case "DELETE_TASK":
      return `Delete task: ${payload.title || "Task"}`;
    case "ADD_CLASS":
      return `Add class: ${payload.subject || "New class"}`;
    case "CREATE_NOTE":
      return `Create note: ${payload.title || "New note"}`;
    case "SET_REMINDER":
      return `Reminder: ${payload.text || "Set reminder"}`;
    default:
      return `Execute action: ${type}`;
  }
}

// ─── Smart Intents ──────────────────────────────────────────────────
// Detect common student commands before hitting the AI.
// Returns a formatted response directly from the store, no API call needed.
// ────────────────────────────────────────────────────────────────────

export interface SmartIntentResult {
  handled: boolean;
  response?: string;
  action?: {
    type: AiActionType;
    payload: Record<string, unknown>;
  };
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function formatScheduleForDay(classes: ClassEvent[], dayName: string): string {
  const dayClasses = classes
    .filter((c) => c.day === dayName.toUpperCase())
    .sort((a, b) => a.start.localeCompare(b.start));
  if (dayClasses.length === 0) return `No classes scheduled for ${dayName}.`;
  const lines = dayClasses.map(
    (c) =>
      `• ${c.start}–${c.end} ${c.subject} (${c.room}${c.teacher ? ", " + c.teacher : ""})`,
  );
  return `${dayName} schedule:\n${lines.join("\n")}`;
}

function formatUpcomingTasks(tasks: Task[]): string {
  const incomplete = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (
        (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      );
    });
  if (incomplete.length === 0) return "No pending tasks. You're all caught up!";
  const lines = incomplete
    .slice(0, 8)
    .map(
      (t) =>
        `• [${t.priority.toUpperCase()}] ${t.title} — due ${t.due} (${t.subject})`,
    );
  return `Your pending tasks:\n${lines.join("\n")}`;
}

/** Detect common student intents and handle them without the AI. */
export function detectSmartIntent(
  text: string,
  store: {
    tasks: Task[];
    classes: ClassEvent[];
    notes: Note[];
  },
): SmartIntentResult {
  const n = text.toLowerCase().trim();

  // ── Schedule queries ──
  const scheduleMatch = n.match(
    /(?:what(?:'s| is)|show|tell me|when is|when do I have)\s+(?:my\s+)?(?:schedule|classes|timetable)\s*(?:for\s+)?(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
  );
  if (scheduleMatch) {
    let dayName: string;
    if (n.includes("today")) {
      dayName = DAY_NAMES[new Date().getDay()];
    } else if (n.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dayName = DAY_NAMES[tomorrow.getDay()];
    } else {
      const dayMatch = n.match(
        /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
      );
      dayName = dayMatch
        ? dayMatch[1].slice(0, 3).toUpperCase()
        : DAY_NAMES[new Date().getDay()];
    }
    const formattedDay = dayName.charAt(0) + dayName.slice(1).toLowerCase();
    return {
      handled: true,
      response: formatScheduleForDay(store.classes, formattedDay),
    };
  }

  // ── Task list queries ──
  const taskQueryMatch = n.match(
    /(?:what(?:'s| is)|show|list|tell me)\s+(?:my\s+)?(?:tasks?|to[- ]?do|homework|assignments?|pending)/,
  );
  if (taskQueryMatch) {
    return {
      handled: true,
      response: formatUpcomingTasks(store.tasks),
    };
  }

  // ── Add task ──
  const addTaskMatch = text.match(
    /(?:add|create|new|make)\s+(?:a\s+)?(?:task|to[- ]?do|assignment)\s*[:\-]?\s+(.+)/i,
  );
  if (addTaskMatch) {
    const raw = addTaskMatch[1].trim();
    // Try to extract "due X"
    const dueMatch = raw.match(/\bdue\s+(.+?)(?:\s*,|\s*$)/i);
    const title = dueMatch ? raw.replace(dueMatch[0], "").trim() : raw;
    const due = dueMatch ? dueMatch[1].trim() : "later";
    return {
      handled: true,
      response: `I'll create a task for you. Click the button below to confirm.`,
      action: {
        type: "CREATE_TASK",
        payload: {
          title: title || "New task",
          due,
          subject: "General",
          priority: "medium",
        },
      },
    };
  }

  // ── Remind me ──
  const remindMatch = text.match(/remind\s+me\s+(?:to\s+)?(.+)/i);
  if (remindMatch) {
    const reminderText = remindMatch[1].trim();
    const dueMatch = reminderText.match(
      /\b(?:by|before|at|on|due)\s+(.+?)(?:\s*,|\s*$)/i,
    );
    return {
      handled: true,
      response: `I'll set up a reminder. Click below to create this task.`,
      action: {
        type: "SET_REMINDER",
        payload: {
          text: dueMatch ? reminderText.replace(dueMatch[0], "").trim() : reminderText,
          due: dueMatch ? dueMatch[1].trim() : "later",
        },
      },
    };
  }

  // ── Create note ──
  const noteMatch = text.match(
    /(?:create|add|new|make)\s+(?:a\s+)?note\s+(?:about\s+|on\s+|for\s+)?(.+)/i,
  );
  if (noteMatch) {
    const topic = noteMatch[1].trim();
    return {
      handled: true,
      response: `I'll create a note for you. Click below to confirm.`,
      action: {
        type: "CREATE_NOTE",
        payload: {
          title: topic,
          subject: "General",
          body: "",
        },
      },
    };
  }

  // ── "What's due" / "What's coming up" ──
  const dueMatch = n.match(
    /(?:what(?:'s| is)\s+(?:due|coming up|upcoming|next))/i,
  );
  if (dueMatch) {
    return {
      handled: true,
      response: formatUpcomingTasks(store.tasks),
    };
  }

  return { handled: false };
}

// ─── Action Execution ───────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  message: string;
}

/** Execute a pending AI action against the Zustand store. */
export function executeAiAction(
  action: PendingAiAction,
  store: {
    addTask: (task: Task) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    addClass: (cls: ClassEvent) => void;
    addNote: (note: Note) => void;
  },
): ActionResult {
  const id = `ai-${action.type.toLowerCase()}-${Date.now()}`;

  switch (action.type) {
    case "CREATE_TASK": {
      const p = action.payload;
      const task: Task = {
        id,
        title: String(p.title || "AI-created task"),
        subject: String(p.subject || "General"),
        due: String(p.due || "later"),
        time: String(p.time || "30 min"),
        priority: (p.priority as Task["priority"]) || "medium",
        completed: false,
        custom: true,
        notes: p.notes ? String(p.notes) : undefined,
      };
      store.addTask(task);
      return { success: true, message: `Created task: ${task.title}` };
    }
    case "UPDATE_TASK": {
      const p = action.payload;
      if (p.id) {
        store.updateTask(String(p.id), p as Partial<Task>);
        return { success: true, message: `Updated task: ${p.title || p.id}` };
      }
      return { success: false, message: "No task ID provided for update." };
    }
    case "DELETE_TASK": {
      const p = action.payload;
      if (p.id) {
        store.deleteTask(String(p.id));
        return { success: true, message: `Deleted task: ${p.title || p.id}` };
      }
      return { success: false, message: "No task ID provided for deletion." };
    }
    case "ADD_CLASS": {
      const p = action.payload;
      const cls: ClassEvent = {
        id,
        subject: String(p.subject || "New Class"),
        teacher: String(p.teacher || ""),
        room: String(p.room || ""),
        day: String(p.day || "MON")
          .slice(0, 3)
          .toUpperCase(),
        start: String(p.start || "09:00"),
        end: String(p.end || "10:00"),
        color: (p.color as ClassEvent["color"]) || "blue",
      };
      store.addClass(cls);
      return { success: true, message: `Added class: ${cls.subject}` };
    }
    case "CREATE_NOTE": {
      const p = action.payload;
      const note: Note = {
        id,
        subject: String(p.subject || "General"),
        title: String(p.title || "AI-created note"),
        preview: String(p.body || "").slice(0, 200),
        body: String(p.body || ""),
        ago: "JUST NOW",
        color: (p.color as Note["color"]) || "blue",
        pinned: false,
      };
      store.addNote(note);
      return { success: true, message: `Created note: ${note.title}` };
    }
    case "SET_REMINDER": {
      const p = action.payload;
      const task: Task = {
        id,
        title: String(p.text || p.title || "Reminder"),
        subject: String(p.subject || "General"),
        due: String(p.due || "later"),
        time: String(p.time || "15 min"),
        priority: "high",
        completed: false,
        custom: true,
      };
      store.addTask(task);
      return { success: true, message: `Reminder set: ${task.title}` };
    }
    default:
      return { success: false, message: `Unknown action type: ${action.type}` };
  }
}
