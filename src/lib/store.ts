import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Task,
  ClassEvent,
  Subject,
  Note,
  FileItem,
  ChatMessage,
} from "@/lib/types";
import {
  setPersistenceErrorHandler,
  setPersistenceNotifier,
  setSchemaDriftHandler,
  queueDelete,
  queueUpsert,
  queueUpsertMany,
  resetPersistenceQueue,
} from "@/lib/supabase/persistence";
import { clearUserScopedStorage } from "@/lib/user-scope";
import type { RemoteSnapshot } from "@/lib/supabase/sync";
import {
  buildHydrationPatch,
  EMPTY_AI_CONFIG as DEFAULT_AI_CONFIG,
  EMPTY_PREFERENCES as DEFAULT_PREFERENCES,
} from "@/lib/supabase/hydrate";

// Re-export all types from the single source of truth
export type {
  ViewName,
  AddType,
  ScheduleTab,
  AcademicFilter,
  AiConfig,
  Preferences,
  NotificationItem,
  SavedChat,
  PendingAiAction,
  AiActionType,
} from "@/lib/types";
import type {
  ViewName,
  AddType,
  ScheduleTab,
  AcademicFilter,
  AiConfig,
  Preferences,
  NotificationItem,
  SavedChat,
  PendingAiAction,
} from "@/lib/types";

interface TimelyState {
  currentView: ViewName;
  addType: AddType;
  tasks: Task[];
  classes: ClassEvent[];
  subjects: Subject[];
  notes: Note[];
  files: FileItem[];
  notifications: NotificationItem[];
  preferences: Preferences;
  weekOffset: number;
  scheduleTab: ScheduleTab;
  academicFilter: AcademicFilter;
  chatMessages: ChatMessage[];
  savedChats: SavedChat[];
  activeSavedChatId: string | null;
  aiConfig: AiConfig;
  aiOnline: boolean;
  importedClasses: ClassEvent[];
  importSource: string;
  importReview: ClassEvent[];
  importConfidence: number | null;
  noteAiTarget: Note | null;
  editingId: string | null;
  pendingAiActions: PendingAiAction[];
  syncStatus: "idle" | "syncing" | "synced" | "error";
  syncError: string | null;
  lastSyncedAt: number | null;
  userId: string | null;
  /** Whether this account finished onboarding (server-side source of truth). */
  onboarded: boolean;
  /**
   * Whether the database can actually answer the `onboarded` question. Starts
   * optimistic and is downgraded only when a read proves the column is absent;
   * while false, `onboarded` is this device's own record and the server value is
   * never allowed to overwrite it.
   */
  onboardedKnown: boolean;
  /** Set when the database is missing a column this build expects. */
  schemaWarning: string | null;
  /** True once the account's profile row has actually been read. */
  profileLoaded: boolean;
  // UI state (not persisted)
  showQuickAdd: boolean;
  showImport: boolean;
  showSearch: boolean;
  showNotifications: boolean;

  setView: (view: ViewName) => void;
  setAddType: (type: AddType) => void;
  setEditingId: (id: string | null) => void;
  setShowQuickAdd: (show: boolean) => void;
  setShowImport: (show: boolean) => void;
  setShowSearch: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
  setUserId: (id: string | null) => void;
  setOnboarded: (value: boolean) => void;
  resetStoreToDefaults: () => void;

  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  addClass: (cls: ClassEvent) => void;
  updateClass: (id: string, updates: Partial<ClassEvent>) => void;
  deleteClass: (id: string) => void;

  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  addFile: (file: FileItem) => void;
  updateFile: (id: string, updates: Partial<FileItem>) => void;
  deleteFile: (id: string) => void;

  addNotification: (notification: NotificationItem) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  setPreferences: (prefs: Partial<Preferences>) => void;
  setWeekOffset: (offset: number) => void;
  setScheduleTab: (tab: ScheduleTab) => void;
  setAcademicFilter: (filter: AcademicFilter) => void;

  addChatMessage: (msg: ChatMessage) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  saveChat: () => void;
  loadSavedChat: (id: string) => void;
  deleteSavedChat: (id: string) => void;
  startNewChat: () => void;
  setAiConfig: (config: Partial<AiConfig>) => void;
  setAiOnline: (online: boolean) => void;

  setImportedClasses: (classes: ClassEvent[]) => void;
  setImportSource: (source: string) => void;
  setImportReview: (classes: ClassEvent[]) => void;
  setImportConfidence: (conf: number | null) => void;
  setNoteAiTarget: (note: Note | null) => void;

  addPendingAiAction: (action: PendingAiAction) => void;
  removePendingAiAction: (id: string) => void;
  clearPendingAiActions: () => void;

  hydrateFromRemote: (snapshot: RemoteSnapshot) => void;
  pullOnlyFromSupabase: () => Promise<void>;
  pullFromSupabase: () => Promise<void>;
  pushToSupabase: () => Promise<void>;

  getTasksForSubject: (subject: string) => Task[];
  getClassesForDay: (day: string) => ClassEvent[];
  getUnreadNotificationCount: () => number;
}

/**
 * Signatures of the demo workspace that older builds persisted into the
 * browser. Used to purge it on upgrade so it can never masquerade as real data.
 */
const LEGACY_DEMO_MARKERS = [
  "Finish History essay introduction",
  "Complete integration problem set",
  "Read chapter 4 — Mrs Dalloway",
  "Industrial revolution — key threads",
  "Calculus_midterm_syllabus.pdf",
  "Dr. Mei Chen",
  "Mrs Dalloway",
];

export function containsLegacyDemoData(state: Record<string, any>): boolean {
  const blob = JSON.stringify({
    tasks: state.tasks,
    classes: state.classes,
    subjects: state.subjects,
    notes: state.notes,
    files: state.files,
    savedChats: state.savedChats,
  });
  return LEGACY_DEMO_MARKERS.some((marker) => blob.includes(marker));
}

/** Opening line of the study chat, without any assumed user name. */
export const CHAT_GREETING =
  "Hey! I've got your day in view. What should we figure out?";

const MAX_CHAT_MESSAGES = 50;
const keepRecentChat = (messages: ChatMessage[]) =>
  messages.slice(-MAX_CHAT_MESSAGES);

function freshState() {
  return {
    currentView: "home" as ViewName,
    addType: "task" as AddType,
    tasks: [] as Task[],
    classes: [] as ClassEvent[],
    subjects: [] as Subject[],
    notes: [] as Note[],
    files: [] as FileItem[],
    notifications: [] as NotificationItem[],
    preferences: { ...DEFAULT_PREFERENCES },
    weekOffset: 0,
    scheduleTab: "week" as ScheduleTab,
    academicFilter: "all" as AcademicFilter,
    chatMessages: [
      { id: "m1", text: CHAT_GREETING, user: false },
    ] as ChatMessage[],
    savedChats: [],
    activeSavedChatId: null,
    aiConfig: { ...DEFAULT_AI_CONFIG },
    aiOnline: false,
    importedClasses: [],
    importSource: "",
    importReview: [],
    importConfidence: null,
    noteAiTarget: null,
    editingId: null,
    pendingAiActions: [],
    syncStatus: "idle" as const,
    syncError: null,
    lastSyncedAt: null,
    userId: null as string | null,
    onboarded: false,
    onboardedKnown: true,
    schemaWarning: null,
    profileLoaded: false,
  };
}

export const useTimelyStore = create<TimelyState>()(
  persist(
    (set, get) => ({
      ...freshState(),
      // UI state (not persisted)
      showQuickAdd: false,
      showImport: false,
      showSearch: false,
      showNotifications: false,

      setView: (view) => set({ currentView: view }),
      setAddType: (type) => set({ addType: type }),
      setEditingId: (id) => set({ editingId: id }),
      setShowQuickAdd: (show) => set({ showQuickAdd: show }),
      setShowImport: (show) => set({ showImport: show }),
      setShowSearch: (show) => set({ showSearch: show }),
      setShowNotifications: (show) => set({ showNotifications: show }),
      setUserId: (id) => set({ userId: id }),

      setOnboarded: (value) => {
        set({ onboarded: value });
        const { userId, preferences, onboardedKnown } = get();
        // Skip the write when a read already proved the column is absent: it is
        // guaranteed to be rejected, and retrying it forever is what left the
        // account stuck. The local flag still records completion.
        if (value && userId && onboardedKnown) {
          queueUpsert("profiles", userId, { ...preferences, onboarded: true });
        }
      },

      addTask: (task) => {
        set((state) => ({ tasks: [task, ...state.tasks] }));
        queueUpsert("tasks", get().userId, task);
      },
      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        }));
        const task = get().tasks.find((t) => t.id === id);
        if (task) queueUpsert("tasks", get().userId, task);
      },
      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        queueDelete("tasks", get().userId, id);
      },
      toggleTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t,
          ),
        }));
        const task = get().tasks.find((t) => t.id === id);
        if (task) queueUpsert("tasks", get().userId, task);
      },

      addClass: (cls) => {
        set((state) => ({ classes: [...state.classes, cls] }));
        queueUpsert("classes", get().userId, cls);
      },
      updateClass: (id, updates) => {
        set((state) => ({
          classes: state.classes.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        }));
        const cls = get().classes.find((c) => c.id === id);
        if (cls) queueUpsert("classes", get().userId, cls);
      },
      deleteClass: (id) => {
        set((state) => ({ classes: state.classes.filter((c) => c.id !== id) }));
        queueDelete("classes", get().userId, id);
      },

      addSubject: (subject) => {
        set((state) => ({ subjects: [...state.subjects, subject] }));
        queueUpsert("subjects", get().userId, subject);
      },
      updateSubject: (id, updates) => {
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        }));
        const subject = get().subjects.find((s) => s.id === id);
        if (subject) queueUpsert("subjects", get().userId, subject);
      },
      deleteSubject: (id) => {
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
        }));
        queueDelete("subjects", get().userId, id);
      },

      addNote: (note) => {
        set((state) => ({ notes: [note, ...state.notes] }));
        queueUpsert("notes", get().userId, note);
      },
      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updates } : n,
          ),
        }));
        const note = get().notes.find((n) => n.id === id);
        if (note) queueUpsert("notes", get().userId, note);
      },
      deleteNote: (id) => {
        set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));
        queueDelete("notes", get().userId, id);
      },

      addFile: (file) => {
        set((state) => ({ files: [file, ...state.files] }));
        queueUpsert("files", get().userId, file);
      },
      updateFile: (id, updates) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, ...updates } : f,
          ),
        }));
        const file = get().files.find((f) => f.id === id);
        if (file) queueUpsert("files", get().userId, file);
      },
      deleteFile: (id) => {
        set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
        queueDelete("files", get().userId, id);
      },

      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));
        queueUpsert("notifications", get().userId, notification);
      },
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }));
        const notification = get().notifications.find((n) => n.id === id);
        if (notification) queueUpsert("notifications", get().userId, notification);
      },
      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
        queueUpsertMany("notifications", get().userId, get().notifications);
      },

      setPreferences: (prefs) => {
        set((state) => ({ preferences: { ...state.preferences, ...prefs } }));
        const { userId, preferences, onboarded } = get();
        if (userId) queueUpsert("profiles", userId, { ...preferences, onboarded });
      },
      setWeekOffset: (offset) => set({ weekOffset: offset }),
      setScheduleTab: (tab) => set({ scheduleTab: tab }),
      setAcademicFilter: (filter) => set({ academicFilter: filter }),

      addChatMessage: (msg) =>
        set((state) => ({
          chatMessages: keepRecentChat([...state.chatMessages, msg]),
        })),
      setChatMessages: (msgs) => set({ chatMessages: keepRecentChat(msgs) }),

      saveChat: () => {
        set((state) => {
          const userMsgs = state.chatMessages.filter((m) => m.user);
          if (userMsgs.length === 0) return state;
          const title = userMsgs[0].text.slice(0, 60);
          if (state.activeSavedChatId) {
            return {
              savedChats: state.savedChats.map((c) =>
                c.id === state.activeSavedChatId
                  ? {
                      ...c,
                      title,
                      messages: [...state.chatMessages],
                      updatedAt: Date.now(),
                    }
                  : c,
              ),
            };
          }
          const newSaved: SavedChat = {
            id: `sc-${Date.now()}`,
            title,
            messages: [...state.chatMessages],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return {
            savedChats: [newSaved, ...state.savedChats].slice(0, 50),
            activeSavedChatId: newSaved.id,
          };
        });
        const state = get();
        const active = state.savedChats.find(
          (c) => c.id === state.activeSavedChatId,
        );
        if (active) queueUpsert("saved_chats", state.userId, active);
      },

      loadSavedChat: (id) =>
        set((state) => {
          const chat = state.savedChats.find((c) => c.id === id);
          if (!chat) return state;
          return { chatMessages: [...chat.messages], activeSavedChatId: id };
        }),

      deleteSavedChat: (id) => {
        set((state) => ({
          savedChats: state.savedChats.filter((c) => c.id !== id),
          activeSavedChatId:
            state.activeSavedChatId === id ? null : state.activeSavedChatId,
        }));
        queueDelete("saved_chats", get().userId, id);
      },

      startNewChat: () =>
        set(() => ({
          chatMessages: [{ id: `m-${Date.now()}`, text: CHAT_GREETING, user: false }],
          activeSavedChatId: null,
        })),

      setAiConfig: (config) => {
        set((state) => ({ aiConfig: { ...state.aiConfig, ...config } }));
        const { userId, aiConfig } = get();
        if (userId) queueUpsert("ai_config", userId, aiConfig);
      },
      setAiOnline: (online) => set({ aiOnline: online }),

      setImportedClasses: (classes) => set({ importedClasses: classes }),
      setImportSource: (source) => set({ importSource: source }),
      setImportReview: (classes) => set({ importReview: classes }),
      setImportConfidence: (conf) => set({ importConfidence: conf }),
      setNoteAiTarget: (note) => set({ noteAiTarget: note }),

      addPendingAiAction: (action) =>
        set((state) => ({
          pendingAiActions: [...state.pendingAiActions, action],
        })),
      removePendingAiAction: (id) =>
        set((state) => ({
          pendingAiActions: state.pendingAiActions.filter((a) => a.id !== id),
        })),
      clearPendingAiActions: () => set({ pendingAiActions: [] }),

      resetStoreToDefaults: () => {
        resetPersistenceQueue();
        clearUserScopedStorage();
        set(freshState());
      },

      /**
       * Apply a remote snapshot. Successfully loaded entities are applied even
       * when empty (so nothing from a previous account can linger); entities
       * whose fetch failed are left untouched (so a network error can never
       * look like "this user has no data").
       */
      hydrateFromRemote: (snapshot) => {
        const { profileLoaded, onboarded } = get();
        const patch = buildHydrationPatch(snapshot, {
          profileLoaded,
          localOnboarded: onboarded,
        });
        set(patch as Partial<TimelyState>);
      },

      pullOnlyFromSupabase: async () => {
        const { userId } = get();
        if (!userId) return;

        set({ syncStatus: "syncing" });
        try {
          await get().pullFromSupabase();
          const { syncError } = get();
          set({
            syncStatus: syncError ? "error" : "synced",
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          console.error("Timely: could not load your workspace", error);
          set({
            syncStatus: "error",
            syncError: "Could not load your workspace. Check your connection.",
          });
        }
      },

      pullFromSupabase: async () => {
        const { userId } = get();
        if (!userId) return;

        const { fetchAllEntities } = await import("@/lib/supabase/sync");
        const snapshot = await fetchAllEntities(userId);
        get().hydrateFromRemote(snapshot);
      },

      pushToSupabase: async () => {
        const { userId } = get();
        if (!userId) return;

        const state = get();
        const { pushWorkspace } = await import("@/lib/supabase/sync");
        const result = await pushWorkspace(userId, {
          tasks: state.tasks,
          classes: state.classes,
          subjects: state.subjects,
          notes: state.notes,
          files: state.files,
          savedChats: state.savedChats,
          notifications: state.notifications,
          // `onboarded` travels with the rest of the profile so finishing setup
          // is persisted before we navigate away, instead of racing the pull on
          // the next screen. Omitted when the database has no such column.
          preferences: {
            ...state.preferences,
            ...(state.onboardedKnown ? { onboarded: state.onboarded } : {}),
          },
          aiConfig: state.aiConfig,
        });

        if (!result.ok) {
          set({
            syncStatus: "error",
            syncError: `Could not save your ${result.failed.join(", ")}.`,
          });
        }
      },

      getTasksForSubject: (subject) =>
        get().tasks.filter((t) => t.subject === subject),
      getClassesForDay: (day) => get().classes.filter((c) => c.day === day),
      getUnreadNotificationCount: () =>
        get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: "timely-store-v1",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      partialize: (state) => ({
        // Only persist data, not UI state
        tasks: state.tasks,
        classes: state.classes,
        subjects: state.subjects,
        notes: state.notes,
        files: state.files,
        notifications: state.notifications,
        preferences: state.preferences,
        weekOffset: state.weekOffset,
        scheduleTab: state.scheduleTab,
        academicFilter: state.academicFilter,
        chatMessages: keepRecentChat(state.chatMessages),
        savedChats: state.savedChats,
        aiConfig: state.aiConfig,
        importedClasses: state.importedClasses,
        importSource: state.importSource,
        importReview: state.importReview,
        importConfidence: state.importConfidence,
        userId: state.userId,
        onboarded: state.onboarded,
      }),
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;

        if (version < 2) {
          const old = state.aiConfig || {};
          state = {
            ...state,
            preferences: {
              ...DEFAULT_PREFERENCES,
              ...state.preferences,
            },
            // migrate from Ollama (baseUrl) to Gemini (apiKey)
            aiConfig:
              old.baseUrl && !old.apiKey
                ? { apiKey: "", model: "gemini-2.5-flash", enabled: false }
                : { ...DEFAULT_AI_CONFIG, ...state.aiConfig },
          };
        }

        if (version < 3) {
          // Earlier builds shipped a seeded demo workspace in the browser. A
          // returning user must never see it as their own data, so it is purged
          // and replaced by whatever the server actually has for them.
          state = { ...state, preferences: { ...DEFAULT_PREFERENCES, ...state.preferences } };
          if (state.preferences?.profileName === "Alex Vale") {
            state = { ...state, preferences: { ...state.preferences, profileName: "" } };
          }
          if (containsLegacyDemoData(state)) {
            return {
              ...state,
              tasks: [],
              classes: [],
              subjects: [],
              notes: [],
              files: [],
              savedChats: [],
              notifications: [],
              importedClasses: [],
              importReview: [],
              onboarded: false,
            };
          }
        }

        return state as TimelyState;
      },
    },
  ),
);

// --- Persistence feedback ---------------------------------------------------
// Keep the UI honest about whether writes actually reached the database.
setPersistenceErrorHandler((entity, message) => {
  console.error(`Timely: could not save ${entity}`, message);
  useTimelyStore.setState({
    syncStatus: "error",
    syncError: `Could not save your changes (${entity}). We'll retry automatically.`,
  });
});

setPersistenceNotifier(() => {
  useTimelyStore.setState({
    syncStatus: "synced",
    lastSyncedAt: Date.now(),
    syncError: null,
  });
});

// Schema drift is not transient like a failed request, so it gets its own
// channel: a dropped column stays dropped until the migration is applied.
setSchemaDriftHandler((message) => {
  useTimelyStore.setState({ schemaWarning: message });
});
