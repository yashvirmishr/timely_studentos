/**
 * Deadline notification engine.
 *
 * Derives contextual notifications from the signed-in user's own tasks —
 * no canned content. Notifications are only produced for tasks that are
 * actually due, and each one has a deterministic id so re-running the
 * engine never duplicates an alert the user already has.
 */
import type { NotificationItem, Task } from "@/lib/types";

/** Tasks store their due bucket as a lowercase human phrase or an ISO date. */
type DueBucket = "today" | "tomorrow" | "this week" | "unscheduled";

/** Local-time YYYY-MM-DD for a given date. */
function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dueBucket(due: string, now: Date): DueBucket | null {
  const normalized = (due || "").trim().toLowerCase();
  if (normalized === "today" || normalized === "tomorrow") return normalized;
  if (normalized === "this week") return "this week";
  // Concrete dates (Google Classroom imports use YYYY-MM-DD): compare
  // against the real clock in local time.
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (normalized === isoDay(now)) return "today";
    if (normalized === isoDay(tomorrow)) return "tomorrow";
    return null;
  }
  return null;
}

/**
 * Build the set of deadline notifications implied by the user's tasks.
 * - Any incomplete task due today gets a "due today" alert.
 * - An incomplete task due tomorrow gets an advance alert only when the
 *   user asked to be reminded the day before.
 */
export function deriveDeadlineNotifications(tasks: Task[]): NotificationItem[] {
  const items: NotificationItem[] = [];
  const now = new Date();

  for (const task of tasks) {
    if (task.completed) continue;
    const bucket = dueBucket(task.due, now);
    if (!bucket) continue;

    if (bucket === "today") {
      items.push({
        id: `due-today-${task.id}`,
        tone: "red",
        icon: "alarm",
        title: `Due today: ${task.title}`,
        detail: task.subject ? `${task.subject} · ${task.time || "no estimate"}` : "Today",
        read: false,
      });
    } else if (bucket === "tomorrow" && task.remind) {
      items.push({
        id: `due-tomorrow-${task.id}`,
        tone: "yellow",
        icon: "notifications",
        title: `Due tomorrow: ${task.title}`,
        detail: task.subject ? `${task.subject} · you asked for a reminder` : "Tomorrow",
        read: false,
      });
    }
  }

  return items;
}
