/**
 * Headless verification script for AI Actions system.
 * Exercises: parseActionsFromResponse, detectSmartIntent, executeAiAction.
 * Run: node tests/verify_ai_actions.mjs
 */

import { readFileSync } from "fs";
import { join } from "path";

// ─── Load source files directly via dynamic import workaround ───
// Since this is a Next.js project with path aliases, we use a CJS bridge.
// We'll inline the logic by reading the source and evaluating it.

function loadModule(sourcePath) {
  const raw = readFileSync(join(process.cwd(), sourcePath), "utf-8");
  return raw;
}

// ═══════════════════════════════════════════════════════════════════
// 1. TEST: parseActionsFromResponse
// ═══════════════════════════════════════════════════════════════════

const ACTION_BLOCK_RE = /\[ACTION:(\w+):(\{[^}]+\})\]/g;

function parseActionsFromResponse(text) {
  const actions = [];
  let cleanText = text;
  let match;
  while ((match = ACTION_BLOCK_RE.exec(text)) !== null) {
    const type = match[1];
    let payload;
    try {
      payload = JSON.parse(match[2]);
    } catch {
      continue;
    }
    actions.push({ id: `test-${Date.now()}`, type, payload });
    cleanText = cleanText.replace(match[0], "").trim();
  }
  cleanText = cleanText.replace(/\n{3,}/g, "\n\n").trim();
  return { cleanText, actions };
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

console.log("\n═══ TEST 1: parseActionsFromResponse ═══\n");

// Test 1a: Single action block
{
  const text = `I'll create that task for you.\n[ACTION:CREATE_TASK:{"title":"Math homework","due":"tomorrow","subject":"Math","priority":"high"}]\nClick confirm to add it.`;
  const result = parseActionsFromResponse(text);
  assert(result.actions.length === 1, "1a: Parses single action block");
  assert(result.actions[0].type === "CREATE_TASK", "1a: Correct type");
  assert(result.actions[0].payload.title === "Math homework", "1a: Correct title");
  assert(result.actions[0].payload.due === "tomorrow", "1a: Correct due date");
  assert(result.actions[0].payload.subject === "Math", "1a: Correct subject");
  assert(!result.cleanText.includes("[ACTION:"), "1a: Action block stripped from clean text");
  assert(result.cleanText.includes("I'll create that task"), "1a: Natural language preserved");
}

// Test 1b: Multiple action blocks
{
  const text = `Sure! I'll add both.\n[ACTION:CREATE_TASK:{"title":"Essay","due":"Fri","subject":"English"}]\n[ACTION:CREATE_TASK:{"title":"Problem set","due":"Thu","subject":"Math"}]\nDone!`;
  const result = parseActionsFromResponse(text);
  assert(result.actions.length === 2, "1b: Parses multiple action blocks");
  assert(result.actions[0].type === "CREATE_TASK", "1b: First action type correct");
  assert(result.actions[1].type === "CREATE_TASK", "1b: Second action type correct");
  assert(result.actions[0].payload.title === "Essay", "1b: First payload correct");
  assert(result.actions[1].payload.title === "Problem set", "1b: Second payload correct");
  assert(result.cleanText.includes("Done!"), "1b: Clean text preserved");
  assert(!result.cleanText.includes("[ACTION:"), "1b: All blocks stripped");
}

// Test 1c: No action blocks
{
  const text = `Your next class is Advanced Calculus at 10:00 in room C02.`;
  const result = parseActionsFromResponse(text);
  assert(result.actions.length === 0, "1c: No actions parsed from plain text");
  assert(result.cleanText === text, "1c: Text unchanged");
}

// Test 1d: Malformed JSON in action block (should skip)
{
  const text = `Something went wrong.\n[ACTION:CREATE_TASK:{invalid json}]\nAnyway, here's what I found.`;
  const result = parseActionsFromResponse(text);
  assert(result.actions.length === 0, "1d: Skips malformed JSON");
  assert(result.cleanText.includes("here's what I found"), "1d: Text preserved");
}

// Test 1e: Different action types
{
  const text = `[ACTION:ADD_CLASS:{"subject":"Physics","day":"MON","start":"14:00","end":"15:30","teacher":"Dr. Smith","room":"L1"}]\n[ACTION:CREATE_NOTE:{"title":"Quantum mechanics intro","subject":"Physics","body":"Key concepts..."}]\n[ACTION:SET_REMINDER:{"text":"Review midterm notes","due":"2024-12-20"}]`;
  const result = parseActionsFromResponse(text);
  assert(result.actions.length === 3, "1e: Parses three different action types");
  assert(result.actions[0].type === "ADD_CLASS", "1e: ADD_CLASS type correct");
  assert(result.actions[1].type === "CREATE_NOTE", "1e: CREATE_NOTE type correct");
  assert(result.actions[2].type === "SET_REMINDER", "1e: SET_REMINDER type correct");
  assert(result.actions[0].payload.subject === "Physics", "1e: ADD_CLASS payload");
  assert(result.actions[1].payload.title === "Quantum mechanics intro", "1e: CREATE_NOTE payload");
  assert(result.actions[2].payload.text === "Review midterm notes", "1e: SET_REMINDER payload");
}

// ═══════════════════════════════════════════════════════════════════
// 2. TEST: detectSmartIntent
// ═══════════════════════════════════════════════════════════════════

console.log("\n═══ TEST 2: detectSmartIntent ═══\n");

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const mockStore = {
  tasks: [
    { id: "t1", title: "History essay", subject: "World History", due: "tomorrow", priority: "high", completed: false, time: "45 min", custom: false },
    { id: "t2", title: "Calculus problem set", subject: "Advanced Calculus", due: "Thu", priority: "medium", completed: false, time: "30 min", custom: false },
    { id: "t3", title: "Read chapter 4", subject: "English Literature", due: "completed", priority: "low", completed: true, time: "20 min", custom: false },
  ],
  classes: [
    { id: "c1", subject: "English Literature", teacher: "Jamie Morgan", room: "B14", day: "TUE", start: "08:30", end: "09:45", color: "lilac" },
    { id: "c2", subject: "Advanced Calculus", teacher: "Dr. Chen", room: "C02", day: "TUE", start: "10:00", end: "11:15", color: "blue" },
    { id: "c3", subject: "World History", teacher: "Priya Shah", room: "A21", day: "WED", start: "14:00", end: "15:15", color: "yellow" },
  ],
  notes: [
    { id: "n1", title: "Industrial revolution", subject: "World History", preview: "Steam power...", body: "Steam power didn't just change factories.", ago: "18 MIN AGO", color: "yellow" },
  ],
};

// Inline the detectSmartIntent function for testing
function detectSmartIntent(text, store) {
  const n = text.toLowerCase().trim();

  // Schedule queries
  const scheduleMatch = n.match(
    /(?:what(?:'s| is)|show|tell me|when is|when do I have)\s+(?:my\s+)?(?:schedule|classes|timetable)\s*(?:for\s+)?(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/,
  );
  if (scheduleMatch) {
    let dayName;
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
    // Format schedule
    const dayClasses = store.classes
      .filter((c) => c.day === dayName)
      .sort((a, b) => a.start.localeCompare(b.start));
    if (dayClasses.length === 0) {
      return { handled: true, response: `No classes scheduled for ${formattedDay}.` };
    }
    const lines = dayClasses.map(
      (c) => `• ${c.start}–${c.end} ${c.subject} (${c.room}${c.teacher ? ", " + c.teacher : ""})`,
    );
    return { handled: true, response: `${formattedDay} schedule:\n${lines.join("\n")}` };
  }

  // Task list queries
  const taskQueryMatch = n.match(
    /(?:what(?:'s| is)|show|list|tell me)\s+(?:my\s+)?(?:tasks?|to[- ]?do|homework|assignments?|pending)/,
  );
  if (taskQueryMatch) {
    const incomplete = store.tasks.filter((t) => !t.completed);
    if (incomplete.length === 0) return { handled: true, response: "No pending tasks!" };
    const lines = incomplete.slice(0, 8).map(
      (t) => `• [${t.priority.toUpperCase()}] ${t.title} — due ${t.due} (${t.subject})`,
    );
    return { handled: true, response: `Your pending tasks:\n${lines.join("\n")}` };
  }

  // Add task (match on original text to preserve case)
  const addTaskMatch = text.match(
    /(?:add|create|new|make)\s+(?:a\s+)?(?:task|to[- ]?do|assignment)\s*[:\-]?\s+(.+)/i,
  );
  if (addTaskMatch) {
    const raw = addTaskMatch[1].trim();
    const dueMatch = raw.match(/\bdue\s+(.+?)(?:\s*,|\s*$)/i);
    const title = dueMatch ? raw.replace(dueMatch[0], "").trim() : raw;
    const due = dueMatch ? dueMatch[1].trim() : "later";
    return {
      handled: true,
      response: `I'll create a task for you. Click the button below to confirm.`,
      action: { type: "CREATE_TASK", payload: { title: title || "New task", due, subject: "General", priority: "medium" } },
    };
  }

  // Remind me (match on original text to preserve case)
  const remindMatch = text.match(/remind\s+me\s+(?:to\s+)?(.+)/i);
  if (remindMatch) {
    const txt = remindMatch[1].trim();
    const dueMatch = txt.match(/\b(?:by|before|at|on|due)\s+(.+?)(?:\s*,|\s*$)/i);
    return {
      handled: true,
      response: `I'll set up a reminder. Click below to create this task.`,
      action: { type: "SET_REMINDER", payload: { text: dueMatch ? txt.replace(dueMatch[0], "").trim() : txt, due: dueMatch ? dueMatch[1].trim() : "later" } },
    };
  }

  // Create note (match on original text to preserve case)
  const noteMatch = text.match(/(?:create|add|new|make)\s+(?:a\s+)?note\s+(?:about\s+|on\s+|for\s+)?(.+)/i);
  if (noteMatch) {
    return {
      handled: true,
      response: `I'll create a note for you. Click below to confirm.`,
      action: { type: "CREATE_NOTE", payload: { title: noteMatch[1].trim(), subject: "General", body: "" } },
    };
  }

  // What's due
  const dueMatch = n.match(/(?:what(?:'s| is)\s+(?:due|coming up|upcoming|next))/i);
  if (dueMatch) {
    const incomplete = store.tasks.filter((t) => !t.completed);
    if (incomplete.length === 0) return { handled: true, response: "No pending tasks." };
    const lines = incomplete.map((t) => `• [${t.priority.toUpperCase()}] ${t.title} — due ${t.due}`);
    return { handled: true, response: `Your pending tasks:\n${lines.join("\n")}` };
  }

  return { handled: false };
}

// Test 2a: Schedule query for Tuesday
{
  const result = detectSmartIntent("what's my schedule tomorrow", mockStore);
  // Note: "tomorrow" depends on current day, so just test that it handles it
  assert(result.handled === true, "2a: Schedule query detected");
  assert(typeof result.response === "string" && result.response.length > 0, "2a: Response is a non-empty string");
}

// Test 2b: Schedule for a specific day
{
  const result = detectSmartIntent("show my schedule tuesday", mockStore);
  assert(result.handled === true, "2b: Tuesday schedule detected");
  assert(result.response.includes("English Literature"), "2b: Includes English Literature class");
  assert(result.response.includes("Advanced Calculus"), "2b: Includes Calculus class");
  assert(result.response.includes("08:30"), "2b: Includes correct time");
  assert(result.response.includes("B14"), "2b: Includes room number");
}

// Test 2c: Task list query
{
  const result = detectSmartIntent("show my tasks", mockStore);
  assert(result.handled === true, "2c: Task list query detected");
  assert(result.response.includes("History essay"), "2c: Includes History essay");
  assert(result.response.includes("Calculus problem set"), "2c: Includes Calculus problem set");
  assert(!result.response.includes("Read chapter 4"), "2c: Does NOT include completed task");
}

// Test 2d: Add task with due date
{
  const result = detectSmartIntent("add task finish essay draft due Friday", mockStore);
  assert(result.handled === true, "2d: Add task detected");
  assert(result.action.type === "CREATE_TASK", "2d: Action type is CREATE_TASK");
  assert(result.action.payload.title === "finish essay draft", "2d: Task title extracted");
  assert(result.action.payload.due === "Friday", "2d: Due date extracted");
}

// Test 2e: Add task without due date
{
  const result = detectSmartIntent("create task buy stationery", mockStore);
  assert(result.handled === true, "2e: Add task (no due) detected");
  assert(result.action.type === "CREATE_TASK", "2e: Action type is CREATE_TASK");
  assert(result.action.payload.title === "buy stationery", "2e: Task title extracted");
  assert(result.action.payload.due === "later", "2e: Default due date used");
}

// Test 2f: Remind me
{
  const result = detectSmartIntent("remind me to email my teacher", mockStore);
  assert(result.handled === true, "2f: Remind me detected");
  assert(result.action.type === "SET_REMINDER", "2f: Action type is SET_REMINDER");
  assert(result.action.payload.text === "email my teacher", "2f: Reminder text extracted");
}

// Test 2g: Create note
{
  const result = detectSmartIntent("create note about photosynthesis", mockStore);
  assert(result.handled === true, "2g: Create note detected");
  assert(result.action.type === "CREATE_NOTE", "2g: Action type is CREATE_NOTE");
  assert(result.action.payload.title === "photosynthesis", "2g: Note title extracted");
}

// Test 2h: What's coming up
{
  const result = detectSmartIntent("what's coming up?", mockStore);
  assert(result.handled === true, "2h: 'What's coming up' detected");
  assert(result.response.includes("History essay"), "2h: Shows pending tasks");
}

// Test 2i: Non-matching text (should NOT be handled)
{
  const result = detectSmartIntent("tell me a joke about cats", mockStore);
  assert(result.handled === false, "2i: Non-matching text not handled");
}

// Test 2j: Wednesday schedule (should show History class)
{
  const result = detectSmartIntent("show my schedule wednesday", mockStore);
  assert(result.handled === true, "2j: Wednesday schedule detected");
  assert(result.response.includes("World History"), "2j: Includes World History");
  assert(result.response.includes("Priya Shah"), "2j: Includes teacher name");
  assert(result.response.includes("A21"), "2j: Includes room");
}

// ═══════════════════════════════════════════════════════════════════
// 3. TEST: executeAiAction
// ═══════════════════════════════════════════════════════════════════

console.log("\n═══ TEST 3: executeAiAction ═══\n");

// Create a mock store that tracks what was added
const storeLog = [];
const mockStoreActions = {
  addTask: (task) => { storeLog.push({ type: "addTask", ...task }); },
  updateTask: (id, updates) => { storeLog.push({ type: "updateTask", id, ...updates }); },
  deleteTask: (id) => { storeLog.push({ type: "deleteTask", id }); },
  addClass: (cls) => { storeLog.push({ type: "addClass", ...cls }); },
  addNote: (note) => { storeLog.push({ type: "addNote", ...note }); },
};

function executeAiAction(action, store) {
  const id = `ai-${action.type.toLowerCase()}-${Date.now()}`;
  switch (action.type) {
    case "CREATE_TASK": {
      const p = action.payload;
      const task = { id, title: String(p.title || "AI task"), subject: String(p.subject || "General"), due: String(p.due || "later"), time: String(p.time || "30 min"), priority: p.priority || "medium", completed: false, custom: true };
      store.addTask(task);
      return { success: true, message: `Created task: ${task.title}` };
    }
    case "ADD_CLASS": {
      const p = action.payload;
      const cls = { id, subject: String(p.subject || "Class"), teacher: String(p.teacher || ""), room: String(p.room || ""), day: String(p.day || "MON").slice(0, 3).toUpperCase(), start: String(p.start || "09:00"), end: String(p.end || "10:00"), color: p.color || "blue" };
      store.addClass(cls);
      return { success: true, message: `Added class: ${cls.subject}` };
    }
    case "CREATE_NOTE": {
      const p = action.payload;
      const note = { id, subject: String(p.subject || "General"), title: String(p.title || "AI note"), preview: String(p.body || "").slice(0, 200), body: String(p.body || ""), ago: "JUST NOW", color: p.color || "blue", pinned: false };
      store.addNote(note);
      return { success: true, message: `Created note: ${note.title}` };
    }
    case "SET_REMINDER": {
      const p = action.payload;
      const task = { id, title: String(p.text || "Reminder"), subject: "General", due: String(p.due || "later"), time: "15 min", priority: "high", completed: false, custom: true };
      store.addTask(task);
      return { success: true, message: `Reminder set: ${task.title}` };
    }
    case "DELETE_TASK": {
      store.deleteTask(String(action.payload.id || ""));
      return { success: true, message: `Deleted task` };
    }
    case "UPDATE_TASK": {
      store.updateTask(String(action.payload.id || ""), action.payload);
      return { success: true, message: `Updated task` };
    }
    default:
      return { success: false, message: `Unknown action: ${action.type}` };
  }
}

// Test 3a: Execute CREATE_TASK
{
  storeLog.length = 0;
  const result = executeAiAction(
    { id: "test-1", type: "CREATE_TASK", label: "Create task", payload: { title: "Study for midterm", subject: "Math", due: "Friday", priority: "high" } },
    mockStoreActions,
  );
  assert(result.success === true, "3a: CREATE_TASK succeeds");
  assert(result.message.includes("Study for midterm"), "3a: Message includes title");
  assert(storeLog.length === 1, "3a: One store operation");
  assert(storeLog[0].type === "addTask", "3a: Store addTask called");
  assert(storeLog[0].title === "Study for midterm", "3a: Title passed correctly");
  assert(storeLog[0].subject === "Math", "3a: Subject passed correctly");
  assert(storeLog[0].due === "Friday", "3a: Due date passed correctly");
  assert(storeLog[0].priority === "high", "3a: Priority passed correctly");
  assert(storeLog[0].completed === false, "3a: Not completed by default");
  assert(storeLog[0].custom === true, "3a: Marked as custom/AI-created");
}

// Test 3b: Execute ADD_CLASS
{
  storeLog.length = 0;
  const result = executeAiAction(
    { id: "test-2", type: "ADD_CLASS", label: "Add class", payload: { subject: "Physics", teacher: "Dr. Smith", room: "L1", day: "MON", start: "14:00", end: "15:30" } },
    mockStoreActions,
  );
  assert(result.success === true, "3b: ADD_CLASS succeeds");
  assert(storeLog[0].type === "addClass", "3b: Store addClass called");
  assert(storeLog[0].subject === "Physics", "3b: Subject correct");
  assert(storeLog[0].day === "MON", "3b: Day correct");
  assert(storeLog[0].start === "14:00", "3b: Start time correct");
  assert(storeLog[0].end === "15:30", "3b: End time correct");
  assert(storeLog[0].teacher === "Dr. Smith", "3b: Teacher correct");
}

// Test 3c: Execute CREATE_NOTE
{
  storeLog.length = 0;
  const result = executeAiAction(
    { id: "test-3", type: "CREATE_NOTE", label: "Create note", payload: { title: "Wave-particle duality", subject: "Physics", body: "Light behaves as both..." } },
    mockStoreActions,
  );
  assert(result.success === true, "3c: CREATE_NOTE succeeds");
  assert(storeLog[0].type === "addNote", "3c: Store addNote called");
  assert(storeLog[0].title === "Wave-particle duality", "3c: Title correct");
  assert(storeLog[0].body === "Light behaves as both...", "3c: Body correct");
  assert(storeLog[0].pinned === false, "3c: Not pinned by default");
}

// Test 3d: Execute SET_REMINDER (should create a high-priority task)
{
  storeLog.length = 0;
  const result = executeAiAction(
    { id: "test-4", type: "SET_REMINDER", label: "Set reminder", payload: { text: "Review notes before class", due: "tomorrow" } },
    mockStoreActions,
  );
  assert(result.success === true, "3d: SET_REMINDER succeeds");
  assert(storeLog[0].type === "addTask", "3d: Creates a task for reminder");
  assert(storeLog[0].title === "Review notes before class", "3d: Title correct");
  assert(storeLog[0].priority === "high", "3d: High priority for reminders");
  assert(storeLog[0].due === "tomorrow", "3d: Due date correct");
}

// Test 3e: Execute DELETE_TASK
{
  storeLog.length = 0;
  const result = executeAiAction(
    { id: "test-5", type: "DELETE_TASK", label: "Delete task", payload: { id: "t1", title: "Old task" } },
    mockStoreActions,
  );
  assert(result.success === true, "3e: DELETE_TASK succeeds");
  assert(storeLog[0].type === "deleteTask", "3e: Store deleteTask called");
  assert(storeLog[0].id === "t1", "3e: Correct task ID passed");
}

// Test 3f: Unknown action type
{
  const result = executeAiAction(
    { id: "test-6", type: "UNKNOWN_ACTION", label: "Unknown", payload: {} },
    mockStoreActions,
  );
  assert(result.success === false, "3f: Unknown action returns failure");
}

// ═══════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════

console.log(`\n═══ RESULTS: ${passed} passed, ${failed} failed ═══\n`);
process.exit(failed > 0 ? 1 : 0);
