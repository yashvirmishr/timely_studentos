/**
 * Production data-isolation verification.
 *
 * Runs the REAL application modules (store, mappers, persistence queue,
 * hydration, analytics, assistant replies) under Node with a localStorage shim
 * and a stubbed network, then asserts:
 *
 *   1. A brand new account starts completely empty — no invented name, no
 *      fake tasks/classes/notes/analytics.
 *   2. Switching accounts cannot leave the previous account's data visible,
 *      even when the new account has zero rows.
 *   3. A failed fetch never wipes the workspace (errors are not "empty").
 *   4. Every write is scoped to the authenticated user id and uses the real
 *      database column names.
 *   5. Deletions are scoped to the authenticated user id.
 *   6. Onboarding state comes from the account's profile row.
 *
 * Run: node tests/verify_data_isolation.mjs
 */

// --- Environment shims ------------------------------------------------------
class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  get length() {
    return this.map.size;
  }
  key(i) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const localStorageShim = new MemoryStorage();
globalThis.window = globalThis;
globalThis.localStorage = localStorageShim;
globalThis.sessionStorage = new MemoryStorage();
globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
  visibilityState: "visible",
  // @supabase/ssr reads document.cookie when building the browser client.
  cookie: "",
};

// Simulate a browser that ran an older build: the seeded demo workspace is
// already sitting in localStorage before the app boots.
localStorageShim.setItem(
  "timely-store-v1",
  JSON.stringify({
    version: 2,
    state: {
      tasks: [{ id: "t1", title: "Finish History essay introduction", subject: "World History", due: "tomorrow", time: "45 min", priority: "high", completed: false }],
      classes: [{ id: "c1", subject: "English Literature", teacher: "Jamie Morgan", room: "B14", day: "TUE", start: "08:30", end: "09:45", color: "lilac" }],
      subjects: [{ id: "calculus", name: "Advanced Calculus", teacher: "Dr. Mei Chen", room: "C02", symbol: "∫", color: "blue", preparedness: 62, tasksDue: 3 }],
      notes: [{ id: "n1", subject: "World History", ago: "18 MIN AGO", title: "Industrial revolution — key threads", preview: "Steam power…", color: "yellow" }],
      files: [{ id: "f1", name: "Calculus_midterm_syllabus.pdf", type: "pdf", subject: "Advanced Calculus", updated: "MAR 02", size: "2.4 MB" }],
      preferences: { notifications: true, theme: "paper", reduceMotion: false, profileName: "Alex Vale" },
      userId: null,
      onboarded: true,
    },
  }),
);

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stub.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub-anon-key";

const networkCalls = [];
globalThis.fetch = async (url, init = {}) => {
  networkCalls.push({ url: String(url), method: init.method || "GET", body: init.body });
  return new Response("[]", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

// --- Test harness -----------------------------------------------------------
let passed = 0;
const failures = [];

function check(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL ${label}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// --- Modules under test -----------------------------------------------------
const { useTimelyStore, CHAT_GREETING, containsLegacyDemoData } = await import("@/lib/store");
const { toRow, fromRow, fromRows } = await import("@/lib/supabase/mappers");
const { buildHydrationPatch, EMPTY_PREFERENCES } = await import(
  "@/lib/supabase/hydrate"
);
const { queueUpsert, queueDelete, flushPersistence, resetPersistenceQueue } =
  await import("@/lib/supabase/persistence");
const { detectColumnDrift, hasColumn, schemaDriftMessage } = await import(
  "@/lib/supabase/schema"
);
const { getAssistantReply } = await import("@/lib/utils");
const {
  getWorkloadData,
  getCompletionRate,
  getEstimatedStudyHours,
  getWeekRange,
  weekdayIndex,
} = await import("@/lib/analytics");
const { scopedKey, clearUserScopedStorage } = await import("@/lib/user-scope");

const isEmptyWorkspace = (state) =>
  state.tasks.length === 0 &&
  state.classes.length === 0 &&
  state.subjects.length === 0 &&
  state.notes.length === 0 &&
  state.files.length === 0 &&
  state.notifications.length === 0 &&
  state.savedChats.length === 0;

// ===========================================================================
section("0. Legacy browser demo data is purged on upgrade");
{
  const hydrated = useTimelyStore.getState();
  check("seeded demo tasks are not hydrated", hydrated.tasks.length === 0);
  check("seeded demo classes are not hydrated", hydrated.classes.length === 0);
  check("seeded demo subjects are not hydrated", hydrated.subjects.length === 0);
  check("seeded demo notes are not hydrated", hydrated.notes.length === 0);
  check("seeded demo files are not hydrated", hydrated.files.length === 0);
  check("fake display name is dropped", hydrated.preferences.profileName === "");
  check("seeded onboarding flag is not trusted", hydrated.onboarded === false);
  check(
    "legacy demo content is gone from localStorage too",
    !/Mei Chen|History essay introduction|Alex Vale|Dalloway/.test(
      localStorageShim.getItem("timely-store-v1") || "",
    ),
  );
  check(
    "legacy demo markers are still detected if data returns",
    containsLegacyDemoData({ tasks: [{ title: "Complete integration problem set" }] }) === true,
  );
  check(
    "real user data is not mistaken for demo data",
    containsLegacyDemoData({ tasks: [{ title: "Chemistry lab report" }] }) === false,
  );
}

// ===========================================================================
section("1. Brand new account starts empty and impersonal");
{
  useTimelyStore.getState().resetStoreToDefaults();
  const s = useTimelyStore.getState();

  check("no tasks/classes/subjects/notes/files", isEmptyWorkspace(s));
  check("display name is empty, not a fake person", s.preferences.profileName === "");
  check("theme defaults to paper", s.preferences.theme === "paper");
  check("AI is disabled by default", s.aiConfig.enabled === false);
  check("no API key stored", s.aiConfig.apiKey === "");
  check("zero unread notifications", s.getUnreadNotificationCount() === 0);
  check("not marked onboarded", s.onboarded === false);
  check(
    "chat greeting does not name the user",
    s.chatMessages[0].text === CHAT_GREETING && !/Alex|Yashvir/i.test(CHAT_GREETING),
  );
  check(
    "no persisted demo payload in localStorage",
    [...localStorageShim.map.values()].every((v) => !/Alex Vale|Mei Chen/.test(v)),
  );
}

// ===========================================================================
section("2. Empty account shows zeros/empty states, never fabricated data");
{
  const workload = getWorkloadData([], []);
  check("workload series is all zeros", workload.every((v) => v === 0));
  check("no synthetic [1,1,1,1,1] filler", workload.join(",") === "0,0,0,0,0,0,0");
  check("completion rate is null (not 0%)", getCompletionRate([]) === null);
  check("study load is 0h", getEstimatedStudyHours([]) === 0);

  const emptyClasses = getAssistantReply("what is due tomorrow?", { tasks: [], classes: [] });
  check(
    "assistant reply invents no subjects/teachers",
    !/History|Calculus|Mei Chen|Room C02|Mrs Dalloway/.test(emptyClasses),
  );
  check(
    "assistant reply admits it has no data",
    /no tasks tracked/i.test(emptyClasses),
  );

  const emptySchedule = getAssistantReply("what classes do I have?", { classes: [] });
  check(
    "schedule question with no classes says so",
    /haven't added any classes/i.test(emptySchedule),
  );
  check(
    "no hardcoded room/teacher leaked",
    !/C02|Mei Chen|Advanced Calculus/.test(emptySchedule),
  );
}

// ===========================================================================
section("3. Real data is used when it exists");
{
  const tasks = [
    { id: "t1", title: "Chemistry lab report", subject: "Chemistry", due: "tomorrow", time: "60 min", priority: "high", completed: false },
    { id: "t2", title: "Read chapter 3", subject: "Biology", due: "FRI", time: "30 min", priority: "low", completed: true },
  ];
  const classes = [
    { id: "c1", subject: "Physics", teacher: "Ms Okafor", room: "P2", day: "MON", start: "09:00", end: "10:00", color: "blue" },
  ];
  check("completion rate from real tasks", getCompletionRate(tasks) === 50);
  check("study load from real estimates", getEstimatedStudyHours(tasks) === 1.5);
  const workload = getWorkloadData(tasks, classes, new Date("2026-09-07T12:00:00"));
  check("Monday class counted once", workload[0] === 1);
  check("Tuesday task counted (tomorrow from Monday)", workload[1] === 1);
  check("completed Friday task excluded", workload[4] === 0);
  check("total is class + open task only", workload.reduce((a, b) => a + b, 0) === 2);
  const settled = new Date("2026-09-09T12:00:00"); // Wednesday
  check("week runs Monday→Sunday", getWeekRange(settled).start.getDay() === 1);
  check("week ends on Sunday", getWeekRange(settled).end.getDay() === 0);
  check("weekday index is Mon=0..Sun=6", weekdayIndex(new Date("2026-09-13T12:00:00")) === 6);

  const reply = getAssistantReply("what is due?", { tasks, classes });
  check("assistant uses the real task title", reply.includes("Chemistry lab report"));
  const classReply = getAssistantReply("what classes do I have?", { tasks, classes });
  check("assistant uses the real class", classReply.includes("Physics"));
}

// ===========================================================================
section("4. Account switch cannot leak the previous account's data");
{
  // Account A signs in with real data.
  useTimelyStore.getState().resetStoreToDefaults();
  const A = useTimelyStore.getState();
  A.setUserId("user-a");
  A.addTask({ id: "a-task", title: "A's private essay", subject: "History", due: "tomorrow", time: "45 min", priority: "high", completed: false });
  A.addSubject({ id: "a-subj", name: "A's History", teacher: "Mr A", room: "A1", symbol: "H", color: "yellow", preparedness: 40, tasksDue: 1, urgent: true });
  A.addNote({ id: "a-note", subject: "A's History", ago: "JUST NOW", title: "A's private note", preview: "secret", color: "yellow" });
  check("account A data is present before switching", useTimelyStore.getState().tasks.length === 1);

  // Account B signs in. B's fetch succeeds and B has NOTHING.
  useTimelyStore.getState().resetStoreToDefaults();
  const B = useTimelyStore.getState();
  B.setUserId("user-b");
  B.hydrateFromRemote({
    data: { tasks: [], classes: [], subjects: [], notes: [], files: [], saved_chats: [], notifications: [], profiles: [{ profileName: "Bee", theme: "dark", reduceMotion: false, notifications: true, onboarded: true }], ai_config: [{ apiKey: "b-key", model: "gemini-2.5-flash", enabled: true }] },
    failed: [],
  });
  const b = useTimelyStore.getState();
  check("B sees no tasks", b.tasks.length === 0);
  check("B sees no subjects", b.subjects.length === 0);
  check("B sees no notes", b.notes.length === 0);
  check("B's name is B's own", b.preferences.profileName === "Bee");
  check("B's theme is B's own", b.preferences.theme === "dark");
  check("B's AI key is B's own", b.aiConfig.apiKey === "b-key");
  check("B is considered onboarded", b.onboarded === true);
  check(
    "A's data exists nowhere in B's state",
    !JSON.stringify(useTimelyStore.getState()).includes("A's private"),
  );
  check("store userId points at B", b.userId === "user-b");

  // And back to A: the same rules apply in the other direction.
  useTimelyStore.getState().resetStoreToDefaults();
  const A2 = useTimelyStore.getState();
  A2.setUserId("user-a");
  A2.hydrateFromRemote({
    data: { tasks: [], classes: [], subjects: [], notes: [], files: [], saved_chats: [], notifications: [], profiles: [{ profileName: "Ay", onboarded: true }], ai_config: [] },
    failed: [],
  });
  check(
    "no trace of B's data for A",
    !/Bee|b-key/.test(JSON.stringify(useTimelyStore.getState())),
  );
}

// ===========================================================================
section("5. A failed fetch preserves local data instead of wiping it");
{
  useTimelyStore.getState().resetStoreToDefaults();
  const s = useTimelyStore.getState();
  s.setUserId("user-a");
  s.addTask({ id: "t-keep", title: "Keep me", subject: "Maths", due: "today", time: "20 min", priority: "low", completed: false });
  unmarkOnboarded: {
    useTimelyStore.setState({ onboarded: true, profileLoaded: true });
  }

  useTimelyStore.getState().hydrateFromRemote({
    data: { tasks: undefined },
    failed: ["tasks", "profiles", "classes", "subjects", "notes", "files", "saved_chats", "notifications", "ai_config"],
  });
  const after = useTimelyStore.getState();
  check("task survives a failed fetch", after.tasks.length === 1);
  check("onboarded flag survives a failed fetch", after.onboarded === true);
  check("profileLoaded stays true so setup is not re-run", after.profileLoaded === true);
  check("sync error is surfaced to the user", typeof after.syncError === "string" && after.syncError.length > 0);

  check(
    "pure helper agrees: failed entity is not applied",
    buildHydrationPatch({ data: { tasks: undefined }, failed: ["tasks"] }, { profileLoaded: true }).tasks === undefined,
  );
  check(
    "pure helper agrees: empty success clears stale rows",
    Array.isArray(buildHydrationPatch({ data: { tasks: [] }, failed: [] }, { profileLoaded: true }).tasks),
  );
  check(
    "pure helper: no profile row means onboarding required",
    buildHydrationPatch({ data: { profiles: [] }, failed: [] }, { profileLoaded: false }).onboarded === false,
  );
  check(
    "pure helper: default preferences are impersonal",
    EMPTY_PREFERENCES.profileName === "",
  );
}

// ===========================================================================
section("0b. A missing column can never be read as 'not onboarded'");
{
  // PostgREST reports drift differently for reads (42703) than writes (PGRST204).
  const asSelect = {
    code: "42703",
    message: "column profiles.onboarded does not exist",
  };
  const asWrite = {
    code: "PGRST204",
    message:
      "Could not find the 'onboarded' column of 'profiles' in the schema cache",
  };
  const asSelectDrift = detectColumnDrift(asSelect);
  const asWriteDrift = detectColumnDrift(asWrite);
  check(
    "a read for an absent column is detected and named",
    asSelectDrift.kind === "missing" && asSelectDrift.column === "onboarded",
  );
  check(
    "a write for an absent column is detected and named",
    asWriteDrift.kind === "missing" && asWriteDrift.column === "onboarded",
  );
  check(
    "a dropped connection is not mistaken for drift",
    detectColumnDrift({ message: "Failed to fetch" }).kind === "none",
  );
  check(
    "a missing table is not mistaken for a missing column",
    detectColumnDrift({
      code: "42P01",
      message: 'relation "profiles" does not exist',
    }).kind === "none",
  );

  // `select("*")` only returns columns that exist, so an absent key is proof.
  check(
    "a column that exists but is unset still counts as present",
    hasColumn({ onboarded: null }, "onboarded") === true,
  );
  check(
    "an absent key counts as missing",
    hasColumn({ profile_name: "x" }, "onboarded") === false,
  );

  // The regression itself: this used to answer `false`, which sent an account
  // that had finished setup straight back to the setup screen, forever.
  const drifted = buildHydrationPatch(
    {
      data: { profiles: [{ profileName: "Real Student", theme: "paper" }] },
      failed: [],
    },
    { profileLoaded: false, localOnboarded: true },
  );
  check("a missing column never answers 'not onboarded'", drifted.onboarded === true);
  check("the answer is flagged as unknown, not as false", drifted.onboardedKnown === false);
  check(
    "drift is reported to the user instead of being swallowed",
    typeof drifted.schemaWarning === "string" &&
      drifted.schemaWarning.includes("onboarded"),
  );

  // A healthy database must still get a definitive answer in both directions.
  const healthy = buildHydrationPatch(
    {
      data: { profiles: [{ profileName: "Real Student", onboarded: false }] },
      failed: [],
    },
    { profileLoaded: false, localOnboarded: true },
  );
  check(
    "a present column still answers definitively",
    healthy.onboarded === false && healthy.onboardedKnown === true,
  );
  check("no warning is raised when the schema is fine", healthy.schemaWarning === null);

  // Brand new account on a drifted database: still sent to setup (there is no
  // local record to trust), and still told why.
  const fresh = buildHydrationPatch(
    { data: { profiles: [{ profileName: "" }] }, failed: [] },
    { profileLoaded: false, localOnboarded: false },
  );
  check(
    "a fresh account on a drifted database is still sent to setup",
    fresh.onboarded === false && fresh.onboardedKnown === false,
  );

  const driftText = schemaDriftMessage("profiles.onboarded");
  check(
    "the warning names the column and the migration to run",
    /onboarded/.test(driftText) && /supabase-schema\.sql/.test(driftText),
  );
}

// ===========================================================================
section("6. Row mapping matches the real database columns");
{
  const note = fromRow("notes", { id: "n1", user_id: "u", title: "T", preview: "P", has_ai_summary: true, body: "b" });
  check("notes: has_ai_summary -> hasAiSummary", note.hasAiSummary === true);
  check("notes: user_id is not exposed to the client", note.user_id === undefined);

  const noteRow = toRow("notes", { id: "n1", title: "T", hasAiSummary: true, bogus: "x" }, "u");
  check("notes: writes has_ai_summary", noteRow.has_ai_summary === true);
  check("notes: unknown fields are dropped", noteRow.bogus === undefined);
  check("notes: user_id is forced to the auth user", noteRow.user_id === "u");

  const cls = toRow("classes", { id: "c1", subject: "P", googleCalendarId: "g1", allDay: true }, "u");
  check("classes: google_calendar_id mapped", cls.google_calendar_id === "g1");
  check("classes: all_day mapped", cls.all_day === true);
  check("classes: camelCase key not sent", cls.googleCalendarId === undefined);

  const subject = toRow("subjects", { id: "s1", name: "Bio", tasksDue: 2 }, "u");
  check("subjects: tasks_due mapped", subject.tasks_due === 2);

  const file = toRow("files", { id: "f1", name: "a.pdf", driveFileId: "d1" }, "u");
  check("files: drive_file_id mapped", file.drive_file_id === "d1");

  const chat = toRow("saved_chats", { id: "sc1", title: "T", messages: [], createdAt: 5, updatedAt: 6 }, "u");
  check("saved_chats: createdAt -> created_at", chat.created_at === 5);
  check("saved_chats: updatedAt -> updated_at", chat.updated_at === 6);

  const chatBack = fromRow("saved_chats", { id: "sc1", title: "T", messages: [], created_at: 5, updated_at: 6 });
  check("saved_chats: round trip keeps createdAt", chatBack.createdAt === 5);

  const profile = toRow("profiles", { profileName: "Ada", reduceMotion: true }, "u");
  check("profiles: profile_name mapped", profile.profile_name === "Ada");
  check("profiles: reduce_motion mapped", profile.reduce_motion === true);
  check("profiles: user_id forced", profile.user_id === "u");

  const ai = toRow("ai_config", { apiKey: "k", model: "m", enabled: true }, "u");
  check("ai_config: api_key mapped", ai.api_key === "k");

  check(
    "client-side objects round trip without loss",
    fromRow("classes", toRow("classes", { id: "c9", subject: "X", googleCalendarId: "g", allDay: true, color: "blue" }, "u")).googleCalendarId === "g",
  );
  check("fromRows tolerates a null response", fromRows("tasks", null).length === 0);
}

// ===========================================================================
section("7. Every write is scoped to the authenticated user");
{
  resetPersistenceQueue();
  networkCalls.length = 0;
  check("null user queues nothing", (queueUpsert("tasks", null, { id: "x", title: "T", subject: "S", due: "today", time: "1 min", priority: "low" }), networkCalls.length === 0));

  queueUpsert("notes", "user-a", { id: "n1", subject: "Bio", title: "N", preview: "p", hasAiSummary: true, ago: "JUST NOW", color: "blue" });
  queueDelete("tasks", "user-a", "old-task");
  await flushPersistence();

  const upsert = networkCalls.find((c) => c.method === "POST" && c.url.includes("/rest/v1/notes"));
  const del = networkCalls.find((c) => c.method === "DELETE");

  check("upsert hits the notes table", !!upsert);
  if (upsert) {
    const rows = JSON.parse(upsert.body);
    check("upsert carries the authenticated user id", rows[0].user_id === "user-a");
    check("upsert uses real column names", rows[0].has_ai_summary === true);
  }
  check("delete targets the tasks table", !!del && del.url.includes("/rest/v1/tasks"));
  if (del) {
    check("delete is filtered by id", del.url.includes("id=eq.old-task"));
    check("delete is filtered by user id", del.url.includes("user_id=eq.user-a"));
  }
  check(
    "no write references a user that was not supplied",
    networkCalls.every((c) => !c.url.includes("user-b") && !(c.body || "").includes("user-b")),
  );

  // Failing writes must be retried, not silently dropped.
  resetPersistenceQueue();
  let failNext = true;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (failNext) {
      failNext = false;
      return new Response(JSON.stringify({ message: "boom" }), { status: 500, headers: { "content-type": "application/json" } });
    }
    return realFetch(url, init);
  };
  queueUpsert("tasks", "user-a", { id: "retry-me", title: "T", subject: "S", due: "today", time: "5 min", priority: "low" });
  await flushPersistence();
  networkCalls.length = 0;
  await flushPersistence();
  globalThis.fetch = realFetch;
  check(
    "a failed write is retried on the next flush",
    networkCalls.some((c) => (c.body || "").includes("retry-me")),
  );
  resetPersistenceQueue();
}

// ===========================================================================
section("8. Per-user browser storage is namespaced and wiped on sign-out");
{
  check("pomodoro key is per user", scopedKey("timely_pomodoro", "user-a") === "timely_pomodoro:user-a");
  check("different users get different keys", scopedKey("timely_pomodoro", "user-a") !== scopedKey("timely_pomodoro", "user-b"));
  check("signed-out key is distinct", scopedKey("timely_pomodoro", null) === "timely_pomodoro:signed-out");

  localStorageShim.setItem("timely_pomodoro:user-a", JSON.stringify({ today: 3 }));
  localStorageShim.setItem("timely_pomodoro:user-b", JSON.stringify({ today: 0 }));
  localStorageShim.setItem("timely-schedule-suggestions:user-a:2|1", "cached AI tips");
  localStorageShim.setItem("timely_google_token", "secret-oauth-token");
  localStorageShim.setItem("timely_gc_client_id", "client-id");
  localStorageShim.setItem("timely-store-v1", JSON.stringify({ state: { tasks: [{ title: "A's private essay" }] } }));
  localStorageShim.setItem("timely_remember_me", "1");
  // A key the app does not own: clearing must be a targeted list, never a
  // "wipe the whole origin" operation that could destroy unrelated state.
  localStorageShim.setItem("some-unrelated-key", "keep me");

  clearUserScopedStorage();

  const leftover = [...localStorageShim.map.keys()];
  check("no per-user pomodoro key survives", leftover.every((k) => !k.startsWith("timely_pomodoro")));
  check("no cached AI suggestion survives", leftover.every((k) => !k.startsWith("timely-schedule-suggestions")));
  check("OAuth tokens cleared", !leftover.includes("timely_google_token"));
  check("Google client id cleared", !leftover.includes("timely_gc_client_id"));
  check("workspace blob cleared", !leftover.includes("timely-store-v1"));
  // Sign-out resets the persistent-session choice. The log-out button has
  // cleared this flag since before this audit (see Sidebar.tsx in HEAD), and
  // signing out again in a later session re-sets it, so the app's single rule
  // is "logging out forgets 'stay signed in'".
  check("remember-me flag cleared on sign-out", !leftover.includes("timely_remember_me"));
  check("unrelated keys are not over-cleared", leftover.includes("some-unrelated-key"));
}

// ===========================================================================
section("9. Store mutations actually reach the database, scoped to the user");
{
  useTimelyStore.getState().resetStoreToDefaults();
  resetPersistenceQueue();
  networkCalls.length = 0;

  const s = useTimelyStore.getState();
  s.setUserId("user-a");
  useTimelyStore.getState().addTask({
    id: "t-write",
    title: "Persist me",
    subject: "Physics",
    due: "today",
    time: "25 min",
    priority: "medium",
    completed: false,
  });
  await flushPersistence();
  check(
    "adding a task writes it to the tasks table",
    networkCalls.some((c) => c.url.includes("/rest/v1/tasks") && (c.body || "").includes("Persist me")),
  );
  check(
    "the write is stamped with the authenticated user",
    networkCalls.some((c) => (c.body || "").includes('"user_id":"user-a"')),
  );

  networkCalls.length = 0;
  useTimelyStore.getState().toggleTask("t-write");
  await flushPersistence();
  check(
    "toggling a task persists the new completed flag",
    networkCalls.some((c) => (c.body || "").includes('"completed":true')),
  );

  networkCalls.length = 0;
  useTimelyStore.getState().deleteTask("t-write");
  await flushPersistence();
  check(
    "deleting a task removes it for that user only",
    networkCalls.some((c) => c.method === "DELETE" && c.url.includes("id=eq.t-write") && c.url.includes("user_id=eq.user-a")),
  );

  networkCalls.length = 0;
  useTimelyStore.getState().addNote({
    id: "n-write",
    subject: "Physics",
    ago: "JUST NOW",
    title: "Note",
    preview: "body",
    color: "blue",
    hasAiSummary: true,
  });
  await flushPersistence();
  check(
    "a note is written with its real column names",
    networkCalls.some((c) => c.url.includes("/rest/v1/notes") && (c.body || "").includes("has_ai_summary")),
  );

  // Regression: singletons (ai_config, profiles) carry no id of their own, so
  // their writes used to be dropped before ever reaching the network — the
  // Gemini key looked saved but vanished on the next sign-in pull.
  networkCalls.length = 0;
  useTimelyStore.getState().setAiConfig({ apiKey: "TEST-KEY", enabled: true });
  await flushPersistence();
  check(
    "saving the Gemini key reaches the ai_config table",
    networkCalls.some((c) => c.url.includes("/rest/v1/ai_config") && (c.body || "").includes("TEST-KEY")),
  );
  check(
    "the ai_config write is stamped with the authenticated user",
    networkCalls.some((c) => (c.body || "").includes('"user_id":"user-a"')),
  );

  networkCalls.length = 0;
  useTimelyStore.getState().setPreferences({ profileName: "New Name" });
  await flushPersistence();
  check(
    "preference changes reach the profiles table",
    networkCalls.some((c) => c.url.includes("/rest/v1/profiles") && (c.body || "").includes("New Name")),
  );

  // Signed out: nothing may be written at all.
  useTimelyStore.getState().resetStoreToDefaults();
  networkCalls.length = 0;
  useTimelyStore.getState().addTask({ id: "t-anon", title: "Nope", subject: "S", due: "today", time: "5 min", priority: "low", completed: false });
  await flushPersistence();
  check("a signed-out session writes nothing", networkCalls.length === 0);
}

// ===========================================================================
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.log("Failures:\n" + failures.map((f) => `  - ${f}`).join("\n"));
}

// The Supabase client keeps an auth-refresh timer alive, so exit explicitly.
process.exit(failures.length > 0 ? 1 : 0);
