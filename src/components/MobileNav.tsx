"use client";

import React from "react";
import type { ViewName, AddType } from "@/lib/types";

interface MobileNavProps {
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
  onOpenQuickAdd: (type: AddType) => void;
}

export default function MobileNav({
  currentView,
  onNavigate,
  onOpenQuickAdd,
}: MobileNavProps) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const NavButton = ({
    view,
    icon,
    label,
  }: {
    view: ViewName;
    icon: string;
    label: string;
  }) => (
    <button
      className={currentView === view ? "active" : ""}
      onClick={() => onNavigate(view)}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <small>{label}</small>
    </button>
  );

  return (
    <>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavButton view="home" icon="home" label="Home" />
        <NavButton view="schedule" icon="calendar_view_week" label="Schedule" />
        <button
          className="mobile-add"
          aria-label="Quick add task"
          onClick={() => onOpenQuickAdd("task")}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
        <NavButton view="academics" icon="menu_book" label="Academics" />
        <div className="mobile-more">
          <button
            type="button"
            aria-label="More sections"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="material-symbols-outlined">more_horiz</span>
            <small>More</small>
          </button>
          <div
            className={`mobile-more-menu ${moreOpen ? "open" : ""}`}
            role="menu"
          >
            {(
              [
                ["assistant", "auto_awesome", "Study chat"],
                ["notes", "sticky_note_2", "Notes"],
                ["files", "folder_open", "Files"],
                ["analytics", "monitoring", "Analytics"],
                ["profile", "person", "Profile"],
              ] as const
            ).map(([view, icon, label]) => (
              <button
                key={view}
                type="button"
                role="menuitem"
                className={currentView === view ? "active" : ""}
                onClick={() => {
                  onNavigate(view);
                  setMoreOpen(false);
                }}
              >
                <span className="material-symbols-outlined">{icon}</span>
                <small>{label}</small>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
