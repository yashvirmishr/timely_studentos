"use client";

import React from "react";
import type { ViewName } from "@/lib/types";
import { useTimelyStore } from "@/lib/store";

interface SidebarProps {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const profileName = useTimelyStore((s) => s.preferences.profileName);
  const initials = profileName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const NavButton = ({ view, icon, label }: { view: ViewName; icon: string; label: string }) => (
    <button
      className={`nav-item ${currentView === view ? "active" : ""}`}
      onClick={() => onNavigate(view)}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand-lockup">
        <div className="brand-mark">
          <span className="material-symbols-outlined">calendar_month</span>
        </div>
        <div>
          <strong>Timely</strong>
          <span>STUDENT OS</span>
        </div>
      </div>

      <div
        className="profile-card"
        style={{ cursor: "pointer" }}
        onClick={() => onNavigate("profile")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onNavigate("profile"); }}
      >
        <div className="avatar">{initials}</div>
        <div className="profile-copy">
          <strong>{profileName}</strong>
          <span>Student · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        </div>
        <button className="icon-button small" aria-label="Open profile">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </div>

      <nav className="nav-list">
        <NavButton view="home" icon="home" label="Home" />
        <NavButton view="schedule" icon="calendar_view_week" label="Schedule" />
        <NavButton view="academics" icon="menu_book" label="Academics" />
        <NavButton view="assistant" icon="auto_awesome" label="Study chat" />
      </nav>

      <nav className="nav-list secondary-nav">
        <NavButton view="notes" icon="sticky_note_2" label="Notes" />
        <NavButton view="files" icon="folder_open" label="Files" />
        <NavButton view="analytics" icon="monitoring" label="Analytics" />
      </nav>

      <div className="sidebar-bottom">
        <div className="sync-status">
          <span className="status-dot"></span>
          <span>All changes synced</span>
          <span className="material-symbols-outlined">cloud_done</span>
        </div>
        <NavButton view="profile" icon="settings" label="Settings" />
        <a
          className="upgrade-card"
          href="https://github.com/timely-student-os/timely"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="sparkle">★</span>
          <span>
            <strong>Free &amp; open source</strong>
            <small>MIT licensed · Star on GitHub</small>
          </span>
          <span className="material-symbols-outlined">open_in_new</span>
        </a>
      </div>
    </aside>
  );
}
