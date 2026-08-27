"use client";

import React from "react";
import type { ViewName } from "@/lib/types";

interface SidebarProps {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
}

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
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

      <div className="profile-card">
        <div className="avatar">AV</div>
        <div className="profile-copy">
          <strong>Alex Vale</strong>
          <span>Year 12 · Spring term</span>
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

      <nav className="nav-list secondary-nav" style={{marginTop: 25}}>
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
