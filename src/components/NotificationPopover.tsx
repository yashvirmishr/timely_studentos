"use client";

import React from "react";
import type { NotificationItem, ViewName } from "@/lib/types";

interface NotificationPopoverProps {
  notifications: NotificationItem[];
  onNotificationClick: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

const TONE_COLORS: Record<string, { bg: string; color: string }> = {
  red: { bg: "#fae6e1", color: "#b71422" },
  blue: { bg: "#e2eef4", color: "#2d5da1" },
  yellow: { bg: "#fff8e1", color: "#f5a623" },
  green: { bg: "#e8f5e9", color: "#4caf50" },
};

const ICON_MAP: Record<string, string> = {
  school: "school",
  event: "event",
  assignment: "assignment",
  grade: "grade",
  announcement: "campaign",
};

export default function NotificationPopover({ notifications, onNotificationClick, onMarkAllRead, onClose }: NotificationPopoverProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-popover show">
      <div className="popover-heading">
        <strong>Notifications</strong>
        <button className="text-button" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          Mark all read
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="empty-state" style={{ padding: 24, textAlign: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#777871" }}>notifications_none</span>
          <strong style={{ display: "block", marginTop: 8 }}>All clear</strong>
          <p style={{ color: "#777871", fontSize: 13 }}>No new notes from your workspace.</p>
        </div>
      ) : (
        notifications.map(notification => (
          <button
            key={notification.id}
            className={`notification-item ${notification.read ? "read" : ""}`}
            onClick={() => onNotificationClick(notification.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: 12,
              borderRadius: 8, textAlign: 'left', background: notification.read ? 'transparent' : '#fdfbf7',
              border: 'none', cursor: 'pointer'
            }}
            onMouseEnter={e => { if (!notification.read) e.currentTarget.style.background = '#f5f3ef'; }}
            onMouseLeave={e => { if (!notification.read) e.currentTarget.style.background = '#fdfbf7'; }}
          >
            <span
              className="notification-dot"
              style={{
                background: TONE_COLORS[notification.tone]?.bg || "#fae6e1",
                color: TONE_COLORS[notification.tone]?.color || "#b71422",
                borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ICON_MAP[notification.icon] || "notifications"}</span>
            </span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 13, display: 'block', color: notification.read ? "#777871" : "#2d2d2d" }}>{notification.title}</strong>
              <small style={{ color: '#777871' }}>{notification.detail}</small>
            </div>
            {!notification.read && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50', flexShrink: 0, marginTop: 4 }} />
            )}
          </button>
        ))
      )}
    </div>
  );
}