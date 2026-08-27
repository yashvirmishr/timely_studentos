"use client";

import React, { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  ViewName,
  AddType,
  ClassEvent,
  Task,
  Note,
  FileItem,
  ChatMessage,
  AiConfig,
} from "@/lib/types";
import { getAssistantReply } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileNav from "@/components/MobileNav";
import HomeView from "@/features/home/HomeView";
const ScheduleView = dynamic(() => import("@/features/schedule/ScheduleView"), {
  ssr: false,
});
const AcademicsView = dynamic(
  () => import("@/features/academics/AcademicsView"),
  { ssr: false },
);
const AssistantView = dynamic(
  () => import("@/features/assistant/AssistantView"),
  { ssr: false },
);
const NotesView = dynamic(() => import("@/features/notes/NotesView"), {
  ssr: false,
});
const FilesView = dynamic(() => import("@/features/files/FilesView"), {
  ssr: false,
});
const AnalyticsView = dynamic(
  () => import("@/features/analytics/AnalyticsView"),
  { ssr: false },
);
const ProfileView = dynamic(() => import("@/features/profile/ProfileView"), {
  ssr: false,
});
const QuickAddModal = dynamic(() => import("@/components/QuickAddModal"), {
  ssr: false,
});
const ImportModal = dynamic(() => import("@/components/ImportModal"), {
  ssr: false,
});
const SearchModal = dynamic(() => import("@/components/SearchModal"), {
  ssr: false,
});
const Toast = dynamic(() => import("@/components/Toast"), { ssr: false });
const NotificationPopover = dynamic(
  () => import("@/components/NotificationPopover"),
  { ssr: false },
);
import UpdateChecker from "@/components/UpdateChecker";
import { usePomodoro } from "@/lib/usePomodoro";
import { useTimelyStore } from "@/lib/store";
import {
  fetchGoogleCalendarEvents,
  getGoogleCalendarConfig,
} from "@/lib/google-calendar";

export default function AppPage() {
  const pomodoro = usePomodoro();
  const {
    currentView,
    setView,
    addType,
    setAddType,
    showQuickAdd,
    setShowQuickAdd,
    showImport,
    setShowImport,
    showSearch,
    setShowSearch,
    showNotifications,
    setShowNotifications,
    tasks,
    classes,
    subjects,
    toggleTask,
    addTask,
    addClass,
    updateClass,
    deleteClass,
    importedClasses,
    setImportedClasses,
    chatMessages,
    addChatMessage,
    savedChats,
    activeSavedChatId,
    saveChat,
    loadSavedChat,
    deleteSavedChat,
    startNewChat,
    aiConfig,
    setAiConfig,
    aiOnline,
    setAiOnline,
    notes,
    addNote,
    updateNote,
    deleteNote,
    files,
    addFile,
    deleteFile,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    preferences,
    setPreferences,
    weekOffset,
    setWeekOffset,
    scheduleTab,
    setScheduleTab,
    academicFilter,
    setAcademicFilter,
    importSource,
    setImportSource,
    importReview,
    setImportReview,
    importConfidence,
    setImportConfidence,
    homeworkReview,
    setHomeworkReview,
    noteAiTarget,
    setNoteAiTarget,
    editingId,
    setEditingId,
  } = useTimelyStore();

  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const [toastMessage, setToastMessage] = React.useState("");
  const [googleCalendarBusy, setGoogleCalendarBusy] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2600);
  }, []);

  const openQuickAdd = useCallback(
    (type: AddType = "task", item?: Task | ClassEvent | Note) => {
      setAddType(type);
      setEditingId(item?.id || null);
      setShowQuickAdd(true);
    },
    [setAddType, setEditingId, setShowQuickAdd],
  );

  const handleAddTask = useCallback(
    (task: Task) => {
      addTask(task);
      showToast(`${task.title} added to Timely`);
    },
    [addTask, showToast],
  );

  const handleUpdateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      useTimelyStore.getState().updateTask(id, updates);
      showToast("Task updated");
    },
    [showToast],
  );

  const handleGoogleCalendarImport = useCallback(async () => {
    const config = getGoogleCalendarConfig();
    if (!config.connected) {
      showToast("Connect Google Calendar in Profile first");
      setView("profile");
      return;
    }
    setGoogleCalendarBusy(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const end = new Date();
      end.setDate(end.getDate() + 60);
      const events = await fetchGoogleCalendarEvents(start, end);
      const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const imported = events
        .map((event, index) => {
          const begin = new Date(event.start);
          const finish = new Date(event.end);
          return {
            id: `gcal-${event.id || index}`,
            subject: event.summary,
            teacher: "Google Calendar",
            room: event.location || "",
            day: dayNames[begin.getDay()],
            start: begin.toTimeString().slice(0, 5),
            end: finish.toTimeString().slice(0, 5),
            color: "blue" as const,
            imported: true,
          };
        })
        .filter((event) =>
          ["MON", "TUE", "WED", "THU", "FRI"].includes(event.day),
        );
      const existing = new Set(
        useTimelyStore.getState().classes.map((item) => item.id),
      );
      imported.forEach((item) => {
        if (!existing.has(item.id)) addClass(item);
      });
      showToast(`${imported.length} Google Calendar events synced`);
    } catch (error: any) {
      showToast(error?.message || "Google Calendar sync failed");
    } finally {
      setGoogleCalendarBusy(false);
    }
  }, [addClass, setView, showToast]);

  const handleAddClass = useCallback(
    (cls: ClassEvent) => {
      addClass(cls);
      showToast(`${cls.subject} added to your schedule`);
    },
    [addClass, showToast],
  );

  const handleUpdateClass = useCallback(
    (id: string, updates: Partial<ClassEvent>) => {
      updateClass(id, updates);
      showToast("Class updated");
    },
    [updateClass, showToast],
  );

  const handleEditClass = useCallback(
    (cls: ClassEvent) => {
      openQuickAdd("event", cls);
    },
    [openQuickAdd],
  );

  const handleDeleteClass = useCallback(
    (id: string) => {
      const state = useTimelyStore.getState();
      const cls = state.classes.find((c) => c.id === id);
      deleteClass(id);
      setImportedClasses(state.importedClasses.filter((c) => c.id !== id));
      showToast(cls ? `${cls.subject} removed` : "Removed");
    },
    [deleteClass, setImportedClasses, showToast],
  );

  const handleAddNote = useCallback(
    (note: Note) => {
      addNote(note);
      showToast("Note added to your library");
    },
    [addNote, showToast],
  );

  const handleUpdateNote = useCallback(
    (id: string, updates: Partial<Note>) => {
      updateNote(id, updates);
      showToast("Note updated");
    },
    [updateNote, showToast],
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      deleteNote(id);
      showToast("Note removed");
    },
    [deleteNote, showToast],
  );

  const handleAddFile = useCallback(
    (file: FileItem) => {
      addFile(file);
      showToast(`${file.name} added to Files`);
    },
    [addFile, showToast],
  );

  const handleDeleteFile = useCallback(
    (id: string) => {
      deleteFile(id);
      showToast("File removed");
    },
    [deleteFile, showToast],
  );

  useEffect(() => {
    if (!aiConfig.enabled) {
      setAiOnline(false);
      return;
    }
    let cancelled = false;
    import("@/lib/local-ai")
      .then(({ checkAiConnection }) => checkAiConnection())
      .then((result) => {
        if (!cancelled) {
          setAiOnline(result.ok);
          if (
            result.ok &&
            result.models?.length &&
            !result.models.includes(useTimelyStore.getState().aiConfig.model)
          )
            setAiConfig({
              model:
                result.models.find((model) => /flash/i.test(model)) ||
                result.models[0],
            });
        }
      })
      .catch(() => {
        if (!cancelled) setAiOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aiConfig.enabled, setAiOnline]);

  // Auto-save chat when navigating away from Study chat
  const prevViewRef = useRef(currentView);
  useEffect(() => {
    const prev = prevViewRef.current;
    prevViewRef.current = currentView;
    // If we were on assistant and moved away, save + start new chat
    if (prev === "assistant" && currentView !== "assistant") {
      const msgs = useTimelyStore.getState().chatMessages;
      if (msgs.some(m => m.user)) {
        saveChat();
        startNewChat();
      }
    }
  }, [currentView, saveChat, startNewChat]);

  // Auto-save chat on page unload (reload / close tab)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useTimelyStore.getState();
      if (state.chatMessages.some(m => m.user)) {
        state.saveChat();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleAiConfigChange = useCallback(
    async (cfg: Partial<AiConfig>) => {
      setAiConfig(cfg);
      if (cfg.enabled === false) {
        setAiOnline(false);
        return;
      }
      if (
        cfg.enabled === true ||
        cfg.apiKey !== undefined ||
        cfg.model !== undefined
      ) {
        const { checkAiConnection } = await import("@/lib/local-ai");
        const r = await checkAiConnection();
        setAiOnline(r.ok);
        if (
          r.ok &&
          r.models?.length &&
          !r.models.includes(useTimelyStore.getState().aiConfig.model)
        )
          setAiConfig({
            model:
              r.models.find((model) => /flash/i.test(model)) || r.models[0],
          });
      }
    },
    [setAiConfig, setAiOnline],
  );

  const [isAiTyping, setIsAiTyping] = React.useState(false);
  const [briefing, setBriefing] = React.useState<string>("");
  const [briefingLoading, setBriefingLoading] = React.useState(false);

  const generateBriefing = React.useCallback(async () => {
    if (!aiConfig.enabled || !aiOnline || !aiConfig.apiKey) return;
    setBriefingLoading(true);
    try {
      const s = useTimelyStore.getState();
      const context = {
        profileName: s.preferences.profileName,
        tasks: s.tasks.map((t) => ({
          title: t.title,
          subject: t.subject,
          due: t.due,
          priority: t.priority,
          completed: t.completed,
        })),
        classes: s.classes.map((c) => ({
          subject: c.subject,
          day: c.day,
          start: c.start,
          end: c.end,
          room: c.room,
          teacher: c.teacher,
        })),
        subjects: s.subjects.map((sub) => ({
          name: sub.name,
          teacher: sub.teacher,
        })),
      };
      const { chatWithLocalAi } = await import("@/lib/local-ai");
      const reply = await chatWithLocalAi({
        messages: [
          {
            role: "system",
            content: `You are Timely AI, a concise academic planner. Generate a 1-2 sentence daily briefing for the student. Mention the most urgent task or deadline, today's classes, and one encouraging suggestion. Be specific with times and subjects. Keep it under 40 words.`,
          },
          {
            role: "user",
            content: `Generate today's briefing. Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}. Context: ${JSON.stringify(context)}`,
          },
        ],
      });
      setBriefing(reply);
    } catch {
      // Briefing is non-critical — silently fall back to static
    } finally {
      setBriefingLoading(false);
    }
  }, [aiConfig.enabled, aiOnline, aiConfig.apiKey]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = { id: "u" + Date.now(), text, user: true };
      addChatMessage(userMsg);

      const buildContext = () => {
        const s = useTimelyStore.getState();
        return {
          profileName: s.preferences.profileName,
          tasks: s.tasks.map((t) => ({
            title: t.title,
            subject: t.subject,
            due: t.due,
            priority: t.priority,
            completed: t.completed,
          })),
          classes: s.classes.map((c) => ({
            subject: c.subject,
            day: c.day,
            start: c.start,
            end: c.end,
            room: c.room,
            teacher: c.teacher,
          })),
          subjects: s.subjects.map((sub) => ({
            name: sub.name,
            teacher: sub.teacher,
            progress: (sub as any).preparedness || (sub as any).progress,
          })),
          notes: s.notes.map((n) => ({
            title: n.title,
            subject: n.subject,
            preview: (n.preview || "").slice(0, 120),
          })),
        };
      };

      const showTyping = () => setIsAiTyping(true);
      const hideTyping = () => setIsAiTyping(false);

      if (aiConfig.enabled && aiOnline && aiConfig.apiKey) {
        showTyping();
        try {
          const history = useTimelyStore
            .getState()
            .chatMessages.filter((m) => m.id !== "m1")
            .map((m) => ({
              role: m.user ? ("user" as const) : ("assistant" as const),
              content: m.text,
            }));
          const { buildMessagesWithHistory, chatWithLocalAi } =
            await import("@/lib/local-ai");
          const msgsWithContext = buildMessagesWithHistory(
            history as any,
            text,
            buildContext(),
          );
          const reply = await chatWithLocalAi({
            messages: msgsWithContext as any,
          });
          hideTyping();
          const aiMsg: ChatMessage = {
            id: "a" + Date.now(),
            text: reply,
            user: false,
          };
          addChatMessage(aiMsg);
        } catch (e: any) {
          hideTyping();
          const fallback = getAssistantReply(text);
          const errorMessage =
            e instanceof Error ? e.message : "Gemini request failed.";
          const aiMsg: ChatMessage = {
            id: "a" + Date.now(),
            text: `${errorMessage}\n\nFallback: ${fallback}`,
            user: false,
          };
          addChatMessage(aiMsg);
        }
      } else if (aiConfig.enabled && !aiConfig.apiKey) {
        const aiMsg: ChatMessage = {
          id: "a" + Date.now(),
          text:
            "Gemini key missing — paste it in Profile → Gemini, then Test. For now: " +
            getAssistantReply(text),
          user: false,
        };
        addChatMessage(aiMsg);
      } else {
        showTyping();
        setTimeout(() => {
          hideTyping();
          const reply = getAssistantReply(text);
          const aiMsg: ChatMessage = {
            id: "a" + Date.now(),
            text: reply,
            user: false,
          };
          addChatMessage(aiMsg);
        }, 650);
      }
    },
    [aiConfig.enabled, aiConfig.apiKey, aiOnline, addChatMessage],
  );

  const handleImport = useCallback(
    (imported: ClassEvent[]) => {
      const existingIds = new Set(
        useTimelyStore.getState().classes.map((cls) => cls.id),
      );
      imported.forEach((cls) => {
        if (!existingIds.has(cls.id)) addClass(cls);
      });
      setImportedClasses(imported);
      showToast(`${imported.length} classes imported · your week is ready`);
    },
    [addClass, setImportedClasses, showToast],
  );

  const handleDismissImported = useCallback(() => {
    const state = useTimelyStore.getState();
    state.importedClasses.forEach((cls) => {
      if (state.classes.some((c) => c.id === cls.id)) {
        deleteClass(cls.id);
      }
    });
    setImportedClasses([]);
  }, [deleteClass, setImportedClasses]);

  const handleTaskImport = useCallback(
    (classroomTasks: Task[]) => {
      const existingIds = new Set(
        useTimelyStore.getState().tasks.map((task) => task.id),
      );
      classroomTasks.forEach((task) => {
        if (!existingIds.has(task.id)) addTask(task);
      });
      const addedCount = classroomTasks.filter(
        (task) => !existingIds.has(task.id),
      ).length;
      showToast(
        `${addedCount} Classroom assignment${addedCount === 1 ? "" : "s"} synced`,
      );
    },
    [addTask, showToast],
  );

  const handleNotificationClick = useCallback(
    (id: string) => {
      markNotificationRead(id);
    },
    [markNotificationRead],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllNotificationsRead();
    showToast("All notifications marked as read");
  }, [markAllNotificationsRead, showToast]);

  // Global keyboard shortcuts: Escape to close modals, Cmd/Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showQuickAdd) setShowQuickAdd(false);
        else if (showImport) setShowImport(false);
        else if (showSearch) setShowSearch(false);
        else if (showNotifications) setShowNotifications(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showQuickAdd, showImport, showSearch, showNotifications]);

  return (
    <div
      className="app-shell"
      data-theme={preferences.theme}
      data-view={currentView}
    >
      <Sidebar currentView={currentView} onNavigate={setView} />
      <div className="main-canvas">
        <Topbar
          currentView={currentView}
          onOpenSearch={() => setShowSearch(true)}
          onToggleNotifications={() => setShowNotifications(!showNotifications)}
          pomodoro={pomodoro}
          unreadCount={notifications.filter((n) => !n.read).length}
        />
        <UpdateChecker />
        <div className="page-content">
          {currentView === "home" && (
            <HomeView
              onNavigate={setView}
              onOpenQuickAdd={openQuickAdd}
              tasks={tasks}
              classes={classes}
              subjects={subjects}
              onTaskToggle={toggleTask}
              pomodoro={pomodoro}
              briefing={briefing}
              briefingLoading={briefingLoading}
              onGenerateBriefing={generateBriefing}
            />
          )}
          {currentView === "schedule" && (
            <ScheduleView
              classes={classes}
              onEditClass={handleEditClass}
              onOpenQuickAdd={openQuickAdd}
              onOpenImport={() => setShowImport(true)}
              onDismissImported={handleDismissImported}
              weekOffset={weekOffset}
              setWeekOffset={setWeekOffset}
              scheduleTab={scheduleTab}
              setScheduleTab={setScheduleTab}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
              onImportGoogleCalendar={handleGoogleCalendarImport}
              googleCalendarBusy={googleCalendarBusy}
            />
          )}
          {currentView === "academics" && (
            <AcademicsView
              onOpenQuickAdd={openQuickAdd}
              tasks={tasks}
              subjects={subjects}
              academicFilter={academicFilter}
              setAcademicFilter={setAcademicFilter}
            />
          )}
          {currentView === "assistant" && (
            <AssistantView
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              aiOnline={aiOnline}
              aiEnabled={aiConfig.enabled}
              isTyping={isAiTyping}
              hasKey={!!aiConfig.apiKey}
              savedChats={savedChats}
              activeSavedChatId={activeSavedChatId}
              onSaveChat={saveChat}
              onLoadChat={loadSavedChat}
              onDeleteChat={deleteSavedChat}
              onNewChat={startNewChat}
            />
          )}
          {currentView === "notes" && (
            <NotesView
              notes={notes}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onOpenQuickAdd={openQuickAdd}
              noteAiTarget={noteAiTarget}
              setNoteAiTarget={setNoteAiTarget}
              homeworkReview={homeworkReview}
              setHomeworkReview={setHomeworkReview}
            />
          )}
          {currentView === "files" && (
            <FilesView
              files={files}
              onAddFile={handleAddFile}
              onDeleteFile={handleDeleteFile}
            />
          )}
          {currentView === "analytics" && (
            <AnalyticsView tasks={tasks} classes={classes} />
          )}
          {currentView === "profile" && (
            <ProfileView
              aiConfig={aiConfig}
              onAiConfigChange={handleAiConfigChange}
              aiOnline={aiOnline}
              onTaskImport={handleTaskImport}
              onToast={showToast}
              preferences={preferences}
              setPreferences={setPreferences}
            />
          )}
        </div>
      </div>
      <MobileNav
        currentView={currentView}
        onNavigate={setView}
        onOpenQuickAdd={openQuickAdd}
      />
      {showQuickAdd && (
        <QuickAddModal
          addType={addType}
          initialItem={
            editingId
              ? (addType === "event"
                  ? classes.find((item) => item.id === editingId)
                  : addType === "note"
                    ? notes.find((item) => item.id === editingId)
                    : tasks.find((item) => item.id === editingId)) || null
              : null
          }
          onAddTypeChange={setAddType}
          onClose={() => setShowQuickAdd(false)}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onAddClass={handleAddClass}
          onUpdateClass={handleUpdateClass}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNote}
          onShowToast={showToast}
          editingId={editingId}
          setEditingId={setEditingId}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          importSource={importSource}
          setImportSource={setImportSource}
          importReview={importReview}
          setImportReview={setImportReview}
          importConfidence={importConfidence}
          setImportConfidence={setImportConfidence}
        />
      )}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onNavigate={setView}
          tasks={tasks}
          classes={classes}
          notes={notes}
          files={files}
        />
      )}
      <Toast message={toastMessage} visible={toastVisible} />
      {showNotifications && (
        <NotificationPopover
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}
