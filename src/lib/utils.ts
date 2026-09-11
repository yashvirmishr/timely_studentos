import type { ClassEvent, Note, Subject, Task } from "./types";

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

export function getAssistantReply(
  text: string,
  data: {
    tasks?: Task[];
    classes?: ClassEvent[];
    subjects?: Subject[];
    notes?: Note[];
  } = {},
): string {
  const normalized = text.toLowerCase();
  const openTasks = (data.tasks || []).filter((task) => !task.completed);
  const classes = data.classes || [];

  const describe = (task: Task) =>
    `${task.title}${task.subject ? ` (${task.subject})` : ""}${
      task.due ? ` — due ${task.due}` : ""
    }`;

  if (normalized.includes("due") || normalized.includes("deadline")) {
    if (openTasks.length === 0) {
      return "You have no tasks tracked right now. Add one and I'll help you plan it.";
    }
    const next = openTasks[0];
    const estimate = next.time ? ` Timely has it at ${next.time}.` : "";
    return `Next up: ${describe(next)}.${estimate}`;
  }

  if (normalized.includes("class") || normalized.includes("room") || normalized.includes("schedule")) {
    if (classes.length === 0) {
      return "You haven't added any classes yet. Add one in Schedule and I'll track it for you.";
    }
    const today = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date().getDay()];
    const todayClasses = classes
      .filter((cls) => cls.day === today)
      .sort((a, b) => a.start.localeCompare(b.start));
    const next = todayClasses[0] || classes[0];
    const room = next.room ? ` in ${next.room}` : "";
    const teacher = next.teacher ? ` with ${next.teacher}` : "";
    return `${next.subject} is at ${next.start}${room}${teacher}.`;
  }

  if (normalized.includes("study") || normalized.includes("time")) {
    if (openTasks.length === 0) {
      return "Nothing is on your list yet, so there's no load to plan around. Add a task and I'll help shape a focus block.";
    }
    const minutes = openTasks.reduce(
      (total, task) => total + (parseInt(task.time, 10) || 0),
      0,
    );
    const label = minutes >= 60 ? `${(minutes / 60).toFixed(1)} hours` : `${minutes} minutes`;
    return `Across your open tasks you're carrying about ${label} of estimated work. A 25-minute focus block is a good place to start.`;
  }

  if (openTasks.length === 0 && classes.length === 0) {
    return "I don't have anything to work with yet — add your first class or task and I'll start planning around it.";
  }

  return "I'm looking at your timetable and tasks now. The kindest next step is a small, focused block — want me to shape one for you?";
}
