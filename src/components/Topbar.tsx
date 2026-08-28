"use client";

import React from "react";
import type { ViewName } from "@/lib/types";
import { VIEW_NAMES } from "@/lib/utils";
import type { PomodoroState } from "@/lib/usePomodoro";
import TopbarPomodoro from "@/components/TopbarPomodoro";

interface TopbarProps {
  currentView: ViewName;
  onOpenSearch: () => void;
  onToggleNotifications: () => void;
  pomodoro: PomodoroState | null;
  unreadCount: number;
}

export default function Topbar({ currentView, onOpenSearch, onToggleNotifications, pomodoro, unreadCount }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <div className="brand-mark">
          <span className="material-symbols-outlined">calendar_month</span>
        </div>
        <strong>Timely</strong>
      </div>
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="material-symbols-outlined">chevron_right</span>
        <strong>{VIEW_NAMES[currentView]}</strong>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-actions">
        {pomodoro && <TopbarPomodoro p={pomodoro} />}
        <button className="search-trigger" onClick={onOpenSearch}>
          <span className="material-symbols-outlined">search</span>
          <span>Search anything</span>
        </button>
        <button
          className="icon-button notification-button"
          onClick={onToggleNotifications}
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
          <i />
        </button>
        <button className="avatar top-avatar">AV</button>
      </div>
    </header>
  );
}