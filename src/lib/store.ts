import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Task, ClassEvent, Subject, Note, FileItem, ChatMessage } from "@/lib/types";

// Re-export all types from the single source of truth
export type { ViewName, AddType, ScheduleTab, AcademicFilter, AiConfig, Preferences, NotificationItem, SavedChat } from "@/lib/types";
import type { ViewName, AddType, ScheduleTab, AcademicFilter, AiConfig, Preferences, NotificationItem, SavedChat } from "@/lib/types";

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
  /** Placeholder for future homework-scan feature. */
  homeworkReview: Record<string, unknown> | null;
  noteAiTarget: Note | null;
  editingId: string | null;
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
  setHomeworkReview: (review: Record<string, unknown> | null) => void;
  setNoteAiTarget: (note: Note | null) => void;

  getTasksForSubject: (subject: string) => Task[];
  getClassesForDay: (day: string) => ClassEvent[];
  getUnreadNotificationCount: () => number;
}

const DEFAULT_PREFERENCES: Preferences = {
  notifications: true,
  theme: "paper",
  reduceMotion: false,
  profileName: "Alex Vale",
};

const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: "",
  model: "gemini-2.5-flash",
  enabled: false,
};

const SEED_SUBJECTS: Subject[] = [
  { id: "calculus", name: "Advanced Calculus", teacher: "Dr. Mei Chen", room: "C02", symbol: "∫", color: "blue", preparedness: 62, tasksDue: 3, tag: "Midterm in 6d", urgent: true },
  { id: "english", name: "English Literature", teacher: "Jamie Morgan", room: "B14", symbol: "Aa", color: "lilac", preparedness: 84, tasksDue: 1, tag: "Mrs Dalloway" },
  { id: "art", name: "Art & Design", teacher: "Sofia Kim", room: "Studio 3", symbol: "✎", color: "green", preparedness: 71, tasksDue: 2, tag: "Sketchbook" },
  { id: "history", name: "World History", teacher: "Priya Shah", room: "A21", symbol: "◈", color: "yellow", preparedness: 48, tasksDue: 6, tag: "Needs focus", urgent: true },
];

const SEED_TASKS: Task[] = [
  { id: "t1", title: "Finish History essay introduction", subject: "World History", due: "tomorrow", time: "45 min", priority: "high", completed: false, custom: false },
  { id: "t2", title: "Complete integration problem set", subject: "Advanced Calculus", due: "Thu", time: "30 min", priority: "medium", completed: false, custom: false },
  { id: "t3", title: "Read chapter 4 — Mrs Dalloway", subject: "English Literature", due: "completed", time: "20 min", priority: "low", completed: true, custom: false },
];

const SEED_CLASSES: ClassEvent[] = [
  { id: "c1", subject: "English Literature", teacher: "Jamie Morgan", room: "B14", day: "TUE", start: "08:30", end: "09:45", color: "lilac" },
  { id: "c2", subject: "Advanced Calculus", teacher: "Dr. Mei Chen", room: "C02", day: "TUE", start: "10:00", end: "11:15", color: "blue" },
  { id: "c3", subject: "Art & Design", teacher: "Sofia Kim", room: "Studio 3", day: "TUE", start: "11:30", end: "13:00", color: "green" },
  { id: "c4", subject: "World History", teacher: "Priya Shah", room: "A21", day: "WED", start: "14:00", end: "15:15", color: "yellow" },
  { id: "c5", subject: "Biology", teacher: "Ravi Patel", room: "Lab 2", day: "THU", start: "09:00", end: "10:15", color: "blue" },
  { id: "c6", subject: "University counselling", teacher: "Student Services", room: "A03", day: "THU", start: "16:00", end: "16:45", color: "red" },
];

const SEED_NOTES: Note[] = [
  { id: "n1", subject: "World History", ago: "18 MIN AGO", title: "Industrial revolution — key threads", preview: "Steam power didn't just change factories. It changed where people lived, worked, and...", color: "yellow", pinned: true, hasAiSummary: true },
  { id: "n2", subject: "Advanced Calculus", ago: "YESTERDAY", title: "Integration by parts", preview: "u dv = uv − ∫ v du\n\nRemember: choose u wisely — logs and inverse trig usually win.", color: "blue", hasAiSummary: true },
  { id: "n3", subject: "English Literature", ago: "MAR 08", title: "Mrs Dalloway — first impressions", preview: '"She had the oddest sense of being herself invisible; unseen; unknown..."', color: "lilac" },
];

const SEED_FILES: FileItem[] = [
  { id: "f1", name: "Calculus_midterm_syllabus.pdf", type: "pdf", subject: "Advanced Calculus", updated: "Today, 09:14", size: "2.4 MB" },
  { id: "f2", name: "History_essay_draft.docx", type: "doc", subject: "World History", updated: "Yesterday", size: "840 KB" },
  { id: "f3", name: "visual_research_board.png", type: "img", subject: "Art & Design", updated: "Mar 08", size: "4.1 MB" },
];

const SEED_NOTIFICATIONS: NotificationItem[] = [
  { id: "notification-1", tone: "red", icon: "school", title: "Calculus midterm is in 6 days", detail: "42% prepared · keep it moving", read: false },
  { id: "notification-2", tone: "blue", icon: "event", title: "Counselling on Thursday", detail: "Room A03 · 4:00 PM", read: false },
];

const SEED_CHAT: ChatMessage[] = [
  { id: "m1", text: "Hey Alex! I've got your day in view. What should we figure out?", user: false },
];

const MAX_CHAT_MESSAGES = 50;
const keepRecentChat = (messages: ChatMessage[]) => messages.slice(-MAX_CHAT_MESSAGES);

export const useTimelyStore = create<TimelyState>()(
  persist(
    (set, get) => ({
      currentView: "home",
      addType: "task",
      tasks: SEED_TASKS,
      classes: SEED_CLASSES,
      subjects: SEED_SUBJECTS,
      notes: SEED_NOTES,
      files: SEED_FILES,
      notifications: SEED_NOTIFICATIONS,
      preferences: DEFAULT_PREFERENCES,
      weekOffset: 0,
      scheduleTab: "week",
      academicFilter: "all",
  chatMessages: SEED_CHAT,
  savedChats: [],
  activeSavedChatId: null,
  aiConfig: DEFAULT_AI_CONFIG,
      aiOnline: false,
      importedClasses: [],
      importSource: "",
      importReview: [],
      importConfidence: null,
      homeworkReview: null,
      noteAiTarget: null,
      editingId: null,
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

      addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
      updateTask: (id, updates) => set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
      toggleTask: (id) => set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)) })),

      addClass: (cls) => set((state) => ({ classes: [...state.classes, cls] })),
      updateClass: (id, updates) => set((state) => ({ classes: state.classes.map((c) => (c.id === id ? { ...c, ...updates } : c)) })),
      deleteClass: (id) => set((state) => ({ classes: state.classes.filter((c) => c.id !== id) })),

      addSubject: (subject) => set((state) => ({ subjects: [...state.subjects, subject] })),
      updateSubject: (id, updates) => set((state) => ({ subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...updates } : s)) })),
      deleteSubject: (id) => set((state) => ({ subjects: state.subjects.filter((s) => s.id !== id) })),

      addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
      updateNote: (id, updates) => set((state) => ({ notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)) })),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

      addFile: (file) => set((state) => ({ files: [file, ...state.files] })),
      deleteFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

      addNotification: (notification) => set((state) => ({ notifications: [notification, ...state.notifications] })),
      markNotificationRead: (id) => set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsRead: () => set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),

      setPreferences: (prefs) => set((state) => ({ preferences: { ...state.preferences, ...prefs } })),
      setWeekOffset: (offset) => set({ weekOffset: offset }),
      setScheduleTab: (tab) => set({ scheduleTab: tab }),
      setAcademicFilter: (filter) => set({ academicFilter: filter }),

      addChatMessage: (msg) => set((state) => ({
        chatMessages: keepRecentChat([...state.chatMessages, msg]),
      })),
      setChatMessages: (msgs) => set({ chatMessages: keepRecentChat(msgs) }),

      saveChat: () => set((state) => {
        const userMsgs = state.chatMessages.filter(m => m.user);
        if (userMsgs.length === 0) return state;
        const title = userMsgs[0].text.slice(0, 60);
        if (state.activeSavedChatId) {
          // Update existing saved chat
          return {
            savedChats: state.savedChats.map(c =>
              c.id === state.activeSavedChatId
                ? { ...c, title, messages: [...state.chatMessages], updatedAt: Date.now() }
                : c
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
      }),

      loadSavedChat: (id) => set((state) => {
        const chat = state.savedChats.find(c => c.id === id);
        if (!chat) return state;
        return { chatMessages: [...chat.messages], activeSavedChatId: id };
      }),

      deleteSavedChat: (id) => set((state) => ({
        savedChats: state.savedChats.filter(c => c.id !== id),
        activeSavedChatId: state.activeSavedChatId === id ? null : state.activeSavedChatId,
      })),

      startNewChat: () => set((state) => ({
        chatMessages: [{ id: `m-${Date.now()}`, text: `Hey ${state.preferences.profileName?.split(' ')[0] || 'Alex'}! I've got your day in view. What should we figure out?`, user: false }],
        activeSavedChatId: null,
      })),

      setAiConfig: (config) => set((state) => ({ aiConfig: { ...state.aiConfig, ...config } })),
      setAiOnline: (online) => set({ aiOnline: online }),

      setImportedClasses: (classes) => set({ importedClasses: classes }),
      setImportSource: (source) => set({ importSource: source }),
      setImportReview: (classes) => set({ importReview: classes }),
      setImportConfidence: (conf) => set({ importConfidence: conf }),
      setHomeworkReview: (review) => set({ homeworkReview: review }),
      setNoteAiTarget: (note) => set({ noteAiTarget: note }),

      getTasksForSubject: (subject) => get().tasks.filter((t) => t.subject === subject),
      getClassesForDay: (day) => get().classes.filter((c) => c.day === day),
      getUnreadNotificationCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: "timely-store-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
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
      }),
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // migrate from Ollama (baseUrl) to Gemini (apiKey)
          const old = persistedState.aiConfig || {};
          if (old.baseUrl && !old.apiKey) {
            return {
              ...persistedState,
              preferences: { ...DEFAULT_PREFERENCES, ...persistedState.preferences },
              aiConfig: { apiKey: "", model: "gemini-2.0-flash", enabled: false },
            };
          }
          return {
            ...persistedState,
            preferences: { ...DEFAULT_PREFERENCES, ...persistedState.preferences },
            aiConfig: { ...DEFAULT_AI_CONFIG, ...persistedState.aiConfig },
          };
        }
        return persistedState as TimelyState;
      },
    }
  )
);