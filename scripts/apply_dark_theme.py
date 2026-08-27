"""Replace the minimal dark theme in globals.css with a comprehensive one."""

import sys
from pathlib import Path

CSS_PATH = Path(__file__).resolve().parents[1] / "src" / "app" / "globals.css"

OLD = """/* Theme and viewport safeguards */
.app-shell[data-theme="dark"] {
  --paper: #1d2224;
  --paper-2: #252b2d;
  --ink: #edf1ed;
  --muted: #aab5b0;
  --line: #465052;
  --blue-wash: #233d4b;
  --lilac: #373342;
  --green: #263b32;
  --yellow: #4a4123;
  background-color: var(--paper);
  color: var(--ink);
}
.app-shell[data-theme="dark"] .topbar,
.app-shell[data-theme="dark"] .sidebar,
.app-shell[data-theme="dark"] .mobile-nav { background: rgba(29,34,36,.94); }
.app-shell[data-theme="dark"] .paper-card,
.app-shell[data-theme="dark"] .modal,
.app-shell[data-theme="dark"] .notification-popover { background: var(--paper-2); }
.app-shell[data-theme="dark"] .search-trigger,
.app-shell[data-theme="dark"] .chat-input,
.app-shell[data-theme="dark"] .text-field,
.app-shell[data-theme="dark"] label > input[type="text"],
.app-shell[data-theme="dark"] label select { background: #30383a; color: var(--ink); }
.app-shell[data-theme="dark"] .message p { background: #30383a; border-color: var(--line); }
.app-shell[data-theme="dark"] .file-header,
.app-shell[data-theme="dark"] .day-heading,
.app-shell[data-theme="dark"] .time-label { background: #293133; }"""

NEW = r"""/* ============================================================
   DARK THEME — full coverage
   ============================================================ */
.app-shell[data-theme="dark"] {
  --paper: #1a1e20;  --paper-2: #22282c;
  --ink: #dfe3df;    --muted: #92a09c;
  --line: #353c3f;
  --shadow: 3px 4px 0 rgba(0,0,0,.5);
  --shadow-soft: 0 8px 24px rgba(0,0,0,.35);
  --red: #e06060;    --red-dark: #c04040;  --red-wash: #3a1a1e;
  --blue: #5da0d8;   --blue-dark: #4a8bc4; --blue-wash: #1e2e3a;
  --lilac: #302840;  --green: #1e3028;     --yellow: #3a3020;
  --color-blue: #5da0d8;  --color-lilac: #7a60a0;
  --color-green: #5a9060; --color-yellow: #b09030;
  --color-red: #e06060;
  background: var(--paper); color: var(--ink);
}
.app-shell[data-theme="dark"]::before { opacity: .015; }

/* Sidebar */
.app-shell[data-theme="dark"] .sidebar { background: rgba(22,26,28,.96); border-color: var(--line); }
.app-shell[data-theme="dark"] .sidebar-label { color: #5a6462; }
.app-shell[data-theme="dark"] .nav-item { color: #8a9593; }
.app-shell[data-theme="dark"] .nav-item:hover { background: #2a3235; color: var(--ink); }
.app-shell[data-theme="dark"] .nav-item.active { background: #1a2a35; color: var(--blue); border-color: #2a3a48; box-shadow: 2px 2px 0 rgba(93,160,216,.15); }
.app-shell[data-theme="dark"] .profile-card { border-color: #2e3437; }
.app-shell[data-theme="dark"] .avatar { background: #3a302a; color: #c4a888; border-color: #5a5550; }
.app-shell[data-theme="dark"] .sync-status { border-color: #2e3437; color: #6a7472; }
.app-shell[data-theme="dark"] .upgrade-card { background: #2a2820; border-color: #4a4530; box-shadow: 2px 3px 0 #3a3520; }
.app-shell[data-theme="dark"] .upgrade-card small { color: #8a7a50; }
.app-shell[data-theme="dark"] .icon-button { color: #7a8583; }
.app-shell[data-theme="dark"] .icon-button:hover { background: #2a3235; border-color: var(--line); color: var(--ink); }

/* Topbar */
.app-shell[data-theme="dark"] .topbar { background: rgba(22,26,28,.92); border-color: #2e3437; }
.app-shell[data-theme="dark"] .breadcrumbs { color: #6a7472; }
.app-shell[data-theme="dark"] .breadcrumbs strong { color: var(--ink); }
.app-shell[data-theme="dark"] .search-trigger { background: rgba(30,36,40,.8); border-color: #3a4043; color: #8a9593; }
.app-shell[data-theme="dark"] .search-trigger:hover { border-color: #4a5558; color: var(--ink); }
.app-shell[data-theme="dark"] .notification-button i { border-color: var(--paper); }
.app-shell[data-theme="dark"] .notification-badge { background: var(--red); }
.app-shell[data-theme="dark"] .topbar-pomodoro { background: rgba(30,36,40,.85); border-color: #3a4043; }
.app-shell[data-theme="dark"] .topbar-pom-btn:hover { background: #2a3235; }

/* Mobile */
.app-shell[data-theme="dark"] .mobile-nav { background: rgba(22,26,28,.96); border-color: #2e3437; }
.app-shell[data-theme="dark"] .mobile-nav button { color: #7a8583; }
.app-shell[data-theme="dark"] .mobile-nav button.active { color: var(--blue); }
.app-shell[data-theme="dark"] .mobile-more-menu { background: var(--paper-2); border-color: var(--line); box-shadow: 4px 5px 0 rgba(0,0,0,.4); }

/* Cards */
.app-shell[data-theme="dark"] .paper-card { background: var(--paper-2); border-color: var(--line); box-shadow: 0 2px 8px rgba(0,0,0,.25); }
.app-shell[data-theme="dark"] .paper-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.35); }

/* Briefing */
.app-shell[data-theme="dark"] .briefing-strip { background: #2a2820; border-color: #4a4530; box-shadow: 2px 3px 0 #3a3520; }
.app-shell[data-theme="dark"] .briefing-icon { background: #3a3020; border-color: #5a5030; color: #c5a040; }
.app-shell[data-theme="dark"] .briefing-copy p { color: #b0a878; }
.app-shell[data-theme="dark"] .arrow-button { border-color: #5a5030; color: #c5a040; }
.app-shell[data-theme="dark"] .arrow-button:hover { background: #3a3020; }

/* Timeline */
.app-shell[data-theme="dark"] .timeline-line { background: #3a4043; }
.app-shell[data-theme="dark"] .timeline-line:before { background: var(--paper-2); border-color: #5a6462; }
.app-shell[data-theme="dark"] .timeline-row.current .timeline-line:before { border-color: var(--red); background: var(--red); }
.app-shell[data-theme="dark"] .timeline-line.dashed { background: repeating-linear-gradient(to bottom, #3a4043 0, #3a4043 4px, transparent 4px, transparent 8px); }
.app-shell[data-theme="dark"] .timeline-now { color: var(--red); }
.app-shell[data-theme="dark"] .timeline-now span { background: var(--paper-2); }

/* Event cards */
.app-shell[data-theme="dark"] .event-card { border-color: #3a4043; }
.app-shell[data-theme="dark"] .event-lilac { background: #302840; }
.app-shell[data-theme="dark"] .event-blue { background: #1e2e3a; }
.app-shell[data-theme="dark"] .event-green { background: #1e3028; }
.app-shell[data-theme="dark"] .event-yellow { background: #3a3020; }
.app-shell[data-theme="dark"] .event-red { background: #3a1a1e; }
.app-shell[data-theme="dark"] .event-card h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .event-card p { color: var(--muted); }
.app-shell[data-theme="dark"] .event-type { color: #7a8583; }
.app-shell[data-theme="dark"] .event-live { background: #3a1a1e; color: var(--red); }
.app-shell[data-theme="dark"] .event-footer { color: #7a8583; }
.app-shell[data-theme="dark"] .event-avatar { background: #3a2d48; border-color: #5a4d68; color: #a090c0; }
.app-shell[data-theme="dark"] .event-check { background: #3a6a42; }

/* Free block */
.app-shell[data-theme="dark"] .free-block { border-color: #3a4043; background: rgba(30,36,40,.5); }
.app-shell[data-theme="dark"] .free-block .material-symbols-outlined { color: #6a7472; }

/* Tasks */
.app-shell[data-theme="dark"] .task-list { background: var(--paper-2); }
.app-shell[data-theme="dark"] .task-row { border-color: #2e3437; }
.app-shell[data-theme="dark"] .task-row:hover { background: #2a3235; }
.app-shell[data-theme="dark"] .fake-checkbox { border-color: #4a5558; }
.app-shell[data-theme="dark"] .task-main strong { color: var(--ink); }
.app-shell[data-theme="dark"] .task-main small { color: var(--muted); }
.app-shell[data-theme="dark"] .task-time { color: #6a7472; }
.app-shell[data-theme="dark"] .priority.high { color: #e07070; background: #3a1a1e; }
.app-shell[data-theme="dark"] .priority.medium { color: #c5a040; background: #3a3020; }
.app-shell[data-theme="dark"] .priority.low { color: #6aaa75; background: #1e3028; }
.app-shell[data-theme="dark"] .completed-task .task-main strong { color: #5a6462; }

/* Upcoming cards */
.app-shell[data-theme="dark"] .exam-card { background: #3a1a1e; border-color: #5a2a28; box-shadow: 3px 4px 0 rgba(0,0,0,.3); }
.app-shell[data-theme="dark"] .meeting-card { background: #1e2e3a; border-color: #2a4050; box-shadow: 3px 4px 0 rgba(0,0,0,.3); }
.app-shell[data-theme="dark"] .upcoming-copy h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .upcoming-copy p { color: var(--muted); }
.app-shell[data-theme="dark"] .tape { background: rgba(60,55,30,.5); border-color: rgba(120,110,60,.3); }

/* Progress / storage */
.app-shell[data-theme="dark"] .progress-track { background: #3a2025; }
.app-shell[data-theme="dark"] .progress-track span { background: var(--red); }
.app-shell[data-theme="dark"] .storage-bar { background: #2a2e30; }
.app-shell[data-theme="dark"] .storage-bar i { background: var(--blue); }

/* Focus / pomodoro */
.app-shell[data-theme="dark"] .focus-card { background: #1e2828; }
.app-shell[data-theme="dark"] .focus-card::after { background: repeating-linear-gradient(0deg, transparent 0 28px, rgba(93,160,216,.04) 28px 29px); }
.app-shell[data-theme="dark"] .focus-content h2 { color: #5da0d8; }
.app-shell[data-theme="dark"] .focus-content p { color: #7a9aa0; }
.app-shell[data-theme="dark"] .focus-scribble { color: var(--red); }
.app-shell[data-theme="dark"] .dark-button { background: #2a3838; border-color: #3a4848; }
.app-shell[data-theme="dark"] .dark-button:hover { background: #3a4848; }
.app-shell[data-theme="dark"] .pomodoro-session-label { color: #7a9aa0; }

/* Quote */
.app-shell[data-theme="dark"] .quote-card { color: #7a8583; }
.app-shell[data-theme="dark"] .quote-mark { color: #3a4043; }

/* Subject cards */
.app-shell[data-theme="dark"] .subject-blue { background: #1a2a35; }
.app-shell[data-theme="dark"] .subject-lilac { background: #282038; }
.app-shell[data-theme="dark"] .subject-green { background: #1e2e28; }
.app-shell[data-theme="dark"] .subject-yellow { background: #2e2818; }
.app-shell[data-theme="dark"] .subject-card h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .subject-card p { color: var(--muted); }
.app-shell[data-theme="dark"] .subject-meter > span { background: rgba(255,255,255,.08); }
.app-shell[data-theme="dark"] .subject-meter small { color: #7a8583; }
.app-shell[data-theme="dark"] .subject-footer { color: #7a8583; }
.app-shell[data-theme="dark"] .subject-tag { background: rgba(255,255,255,.06); }
.app-shell[data-theme="dark"] .urgent-tag { color: var(--red); }

/* Filter pills */
.app-shell[data-theme="dark"] .filter-pills { background: #1e2426; }
.app-shell[data-theme="dark"] .filter-pills button { color: #7a8583; }
.app-shell[data-theme="dark"] .filter-pills button.active { background: #2a3235; color: var(--ink); }

/* Schedule */
.app-shell[data-theme="dark"] .schedule-toolbar { background: var(--paper-2); border-color: var(--line); }
.app-shell[data-theme="dark"] .view-tabs { background: #1e2426; }
.app-shell[data-theme="dark"] .view-tabs button { color: #7a8583; }
.app-shell[data-theme="dark"] .view-tabs button.active { background: #2a3235; color: var(--ink); }
.app-shell[data-theme="dark"] .week-corner { background: #1e2426; }
.app-shell[data-theme="dark"] .day-heading { background: #1e2426; color: var(--ink); }
.app-shell[data-theme="dark"] .day-heading span { color: #6a7472; }
.app-shell[data-theme="dark"] .today-day { background: #1a2a35; color: var(--blue); }
.app-shell[data-theme="dark"] .time-label { background: #1e2426; color: #6a7472; }
.app-shell[data-theme="dark"] .grid-cell { border-color: #2e3437; }
.app-shell[data-theme="dark"] .today-cell { background: rgba(30,60,80,.2); }
.app-shell[data-theme="dark"] .week-grid > * { border-color: #2e3437; }
.app-shell[data-theme="dark"] .class-block { box-shadow: 1px 2px 0 rgba(0,0,0,.2); }
.app-shell[data-theme="dark"] .class-block strong { color: var(--ink); }
.app-shell[data-theme="dark"] .class-block small { color: #7a8583; }
.app-shell[data-theme="dark"] .schedule-note { color: #8a9593; }

/* Academics */
.app-shell[data-theme="dark"] .summary-stat { background: var(--paper-2); }
.app-shell[data-theme="dark"] .stat-icon.red-icon { background: #3a1a1e; color: var(--red); }
.app-shell[data-theme="dark"] .stat-icon.blue-icon { background: #1e2e3a; color: var(--blue); }
.app-shell[data-theme="dark"] .stat-icon.yellow-icon { background: #3a3020; color: #c5a040; }

/* Assistant / chat */
.app-shell[data-theme="dark"] .chat-window { background: var(--paper-2); }
.app-shell[data-theme="dark"] .chat-header { background: #1e2828; border-color: var(--line); }
.app-shell[data-theme="dark"] .assistant-avatar { background: var(--blue); border-color: #4a5558; }
.app-shell[data-theme="dark"] .chat-messages { background: var(--paper); }
.app-shell[data-theme="dark"] .message p { background: #2a3235; border-color: #3a4043; color: var(--ink); }
.app-shell[data-theme="dark"] .message span { color: #6a7472; }
.app-shell[data-theme="dark"] .user-message p { background: var(--blue-dark); border-color: #3a7090; }
.app-shell[data-theme="dark"] .chat-input { background: #2a3235; border-color: #3a4043; }
.app-shell[data-theme="dark"] .chat-input input { color: var(--ink); }
.app-shell[data-theme="dark"] .send-button { background: var(--red); }
.app-shell[data-theme="dark"] .attach-button { color: #6a7472; }
.app-shell[data-theme="dark"] .suggestion-chip { background: #1e2e3a; border-color: #2a4050; color: var(--blue); }
.app-shell[data-theme="dark"] .suggestion-chip:hover { background: #2a3a48; }
.app-shell[data-theme="dark"] .side-note { background: #2a2820; border-color: #4a4530; box-shadow: 3px 4px 0 rgba(0,0,0,.3); }
.app-shell[data-theme="dark"] .side-note h3 { color: #c5a040; }
.app-shell[data-theme="dark"] .side-note p { color: #b0a070; }
.app-shell[data-theme="dark"] .assistant-blue-note { background: #1e2e3a; border-color: #2a4050; box-shadow: 3px 4px 0 rgba(0,0,0,.3); }

/* Notes */
.app-shell[data-theme="dark"] .notes-toolbar { background: var(--paper-2); border-color: var(--line); }
.app-shell[data-theme="dark"] .search-inline { color: #6a7472; }
.app-shell[data-theme="dark"] .search-inline input { color: var(--ink); }
.app-shell[data-theme="dark"] .yellow-note { background: #3a3020; border-color: #5a5030; }
.app-shell[data-theme="dark"] .blue-note { background: #1e2e3a; border-color: #2a4050; }
.app-shell[data-theme="dark"] .lilac-note { background: #282038; border-color: #3a3050; }
.app-shell[data-theme="dark"] .note-card { border-color: #3a4043; box-shadow: 4px 5px 0 rgba(0,0,0,.2); }
.app-shell[data-theme="dark"] .note-card h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .note-card p { color: #b0a880; }
.app-shell[data-theme="dark"] .note-label { color: #8a8060; }
.app-shell[data-theme="dark"] .note-footer { color: #7a7050; }
.app-shell[data-theme="dark"] .row-actions.note-actions button { color: #8a7a50; }
.app-shell[data-theme="dark"] .row-actions.note-actions button:hover { background: rgba(255,255,255,.06); color: #c5b070; }
.app-shell[data-theme="dark"] .note-pin { background: rgba(60,55,30,.5); border-color: rgba(100,90,50,.3); }

/* Files */
.app-shell[data-theme="dark"] .storage-card { background: var(--paper-2); }
.app-shell[data-theme="dark"] .storage-icon { background: #1e2e3a; color: var(--blue); }
.app-shell[data-theme="dark"] .file-table { background: var(--paper-2); }
.app-shell[data-theme="dark"] .file-row { border-color: #2e3437; color: #8a9593; }
.app-shell[data-theme="dark"] .file-header { background: #1e2426; color: #6a7472; }
.app-shell[data-theme="dark"] .file-name { color: var(--ink); }
.app-shell[data-theme="dark"] .file-type.pdf { background: #3a1a1e; color: #e07070; }
.app-shell[data-theme="dark"] .file-type.doc { background: #1e2e3a; color: #5da0d8; }
.app-shell[data-theme="dark"] .file-type.img { background: #3a3020; color: #c5a040; }
.app-shell[data-theme="dark"] .file-dropzone { border-color: #3a4043; }
.app-shell[data-theme="dark"] .file-dropzone:hover { border-color: var(--blue); background: rgba(30,60,80,.15); }

/* Analytics */
.app-shell[data-theme="dark"] .analytics-card { background: var(--paper-2); }
.app-shell[data-theme="dark"] .analytics-card h2 { color: var(--ink); }
.app-shell[data-theme="dark"] .trend-badge { background: #1e3028; color: #6aaa75; }
.app-shell[data-theme="dark"] .bar-chart { background: repeating-linear-gradient(to bottom, transparent 0 37px, rgba(60,70,72,.4) 37px 38px); border-color: #3a4043; }
.app-shell[data-theme="dark"] .bar-chart > span { background: #2a4050; }
.app-shell[data-theme="dark"] .bar-chart > span.chart-today { background: var(--red); }
.app-shell[data-theme="dark"] .bar-chart i { color: #6a7472; }
.app-shell[data-theme="dark"] .workload-card { background: #1e2a22; }
.app-shell[data-theme="dark"] .workload-card h2 { color: var(--ink); }
.app-shell[data-theme="dark"] .workload-card p { color: #7a9a80; }
.app-shell[data-theme="dark"] .pulse-line i { background: #2a4a30; }
.app-shell[data-theme="dark"] .pulse-line i.active { background: #4a8a50; }
.app-shell[data-theme="dark"] .workload-card > small { color: #6a8a70; }
.app-shell[data-theme="dark"] .ring-chart:after { background: var(--paper-2); }
.app-shell[data-theme="dark"] .ring-chart strong { color: var(--blue); }
.app-shell[data-theme="dark"] .completion-card h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .completion-card p { color: var(--muted); }

/* Profile */
.app-shell[data-theme="dark"] .settings-card { background: var(--paper-2); }
.app-shell[data-theme="dark"] .settings-card h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .profile-large h2 { color: var(--ink); }
.app-shell[data-theme="dark"] .profile-large > p { color: var(--muted); }
.app-shell[data-theme="dark"] .connection-row { border-color: #2e3437; }
.app-shell[data-theme="dark"] .connection-row strong { color: var(--ink); }
.app-shell[data-theme="dark"] .connection-row small { color: var(--muted); }
.app-shell[data-theme="dark"] .connection-logo { background: #2a3235; color: #8a9593; }
.app-shell[data-theme="dark"] .connection-logo.google { background: #3a1a1e; color: #e07070; }
.app-shell[data-theme="dark"] .connection-logo.outlook { background: #1e2e3a; color: #5da0d8; }
.app-shell[data-theme="dark"] .settings-link { border-color: #2e3437; color: #8a9593; }
.app-shell[data-theme="dark"] .settings-link:hover { color: var(--blue); }
.app-shell[data-theme="dark"] .term-row { color: #8a9593; }
.app-shell[data-theme="dark"] .term-row strong { color: var(--ink); }
.app-shell[data-theme="dark"] .text-field { background: #2a3235; border-color: var(--line); color: var(--ink); }
.app-shell[data-theme="dark"] .field-label { color: var(--muted); }
.app-shell[data-theme="dark"] .hint-text { color: #6a7472; }
.app-shell[data-theme="dark"] .hint-text a { color: var(--blue); }
.app-shell[data-theme="dark"] .hint-text code { background: #2a3235; }
.app-shell[data-theme="dark"] .check-row { color: #b0b8b5; }

/* Modals */
.app-shell[data-theme="dark"] .modal-backdrop { background: rgba(0,0,0,.65); }
.app-shell[data-theme="dark"] .modal { background: var(--paper-2); border-color: var(--line); box-shadow: 8px 9px 0 rgba(0,0,0,.5); }
.app-shell[data-theme="dark"] .quick-add-modal { background: var(--paper-2); }
.app-shell[data-theme="dark"] .add-type-tabs { background: #1e2426; }
.app-shell[data-theme="dark"] .add-type-tabs button { color: #7a8583; border-color: #3a4043; }
.app-shell[data-theme="dark"] .add-type-tabs button.active { background: #2a3235; color: var(--blue); border-color: #3a5060; }
.app-shell[data-theme="dark"] .section-kicker { color: #6a7472; }
.app-shell[data-theme="dark"] label > span { color: #9aa3a0; }

/* Search modal */
.app-shell[data-theme="dark"] .search-modal { background: var(--paper-2); }
.app-shell[data-theme="dark"] .search-modal-input { border-color: var(--line); }
.app-shell[data-theme="dark"] .search-results button:hover { background: #2a3235; }
.app-shell[data-theme="dark"] .search-results button strong { color: var(--ink); }

/* Notification popover */
.app-shell[data-theme="dark"] .notification-popover { background: var(--paper-2); border-color: var(--line); box-shadow: 4px 5px 0 rgba(0,0,0,.4); }
.app-shell[data-theme="dark"] .popover-heading { border-color: #2e3437; }
.app-shell[data-theme="dark"] .notification-item { border-color: #2e3437; }
.app-shell[data-theme="dark"] .notification-item strong { color: var(--ink); }
.app-shell[data-theme="dark"] .notification-dot { background: #2a3235; }

/* Toast */
.app-shell[data-theme="dark"] .toast { background: #dfe3df; color: #1a1e20; }
.app-shell[data-theme="dark"] .toast .material-symbols-outlined { color: #4a8a50; }

/* AI note modal */
.app-shell[data-theme="dark"] .ai-original-note { background: #2a2820; border-color: #4a4530; }
.app-shell[data-theme="dark"] .ai-original-note h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .ai-original-note p { color: #b0a880; }
.app-shell[data-theme="dark"] .ai-result-note { background: #1e2e30; border-color: #2a4043; }
.app-shell[data-theme="dark"] .ai-result-note h3 { color: var(--ink); }
.app-shell[data-theme="dark"] .ai-result-note p { color: #b0c0c0; }
.app-shell[data-theme="dark"] .ai-modal-status { background: #2a3235; border-color: #3a4043; color: var(--muted); }
.app-shell[data-theme="dark"] .ai-review-badge { color: var(--blue); }

/* Import modal */
.app-shell[data-theme="dark"] .upload-dropzone { background: #1e2426; border-color: #3a4043; }
.app-shell[data-theme="dark"] .upload-dropzone:hover { background: #2a3235; border-color: var(--blue); }
.app-shell[data-theme="dark"] .upload-illustration { background: #1e2e3a; border-color: #2a4050; color: var(--blue); }
.app-shell[data-theme="dark"] .scan-animation { background: #1e2828; border-color: #2e3e3e; }
.app-shell[data-theme="dark"] .review-summary { background: #1e2a22; border-color: #2e4a32; }
.app-shell[data-theme="dark"] .confidence-badge { background: #1e2a22; color: #6aaa75; }
.app-shell[data-theme="dark"] .review-row { border-color: #2e3437; background: var(--paper-2); }
.app-shell[data-theme="dark"] .review-row:hover { background: #2a3235; }
.app-shell[data-theme="dark"] .review-fields input { color: var(--ink); }
.app-shell[data-theme="dark"] .review-room input { color: var(--ink); }

/* Misc */
.app-shell[data-theme="dark"] .primary-button { box-shadow: 3px 3px 0 rgba(0,0,0,.4); }
.app-shell[data-theme="dark"] .primary-button:hover { box-shadow: 5px 5px 0 rgba(0,0,0,.4); }
.app-shell[data-theme="dark"] .status-msg.status-success { color: #6aaa75; }
.app-shell[data-theme="dark"] .status-msg.status-error { color: #e07070; }
.app-shell[data-theme="dark"] .imported-notice { background: #1e2a22; border-color: #2e4a32; }
.app-shell[data-theme="dark"] .update-banner { background: #1e2e3a; border-color: #2a4050; color: var(--blue); }"""

content = CSS_PATH.read_text(encoding="utf-8")

if OLD not in content:
    print("ERROR: old dark theme block not found")
    sys.exit(1)

content = content.replace(OLD, NEW)
CSS_PATH.write_text(content, encoding="utf-8")
print(f"Dark theme replaced — {len(NEW)} chars written")
