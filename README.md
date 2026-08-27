# Timely — Student OS

An AI-powered academic operating system for students, built with [Tauri](https://tauri.app/) + [Next.js](https://nextjs.org/). Free and open source.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Tauri 2](https://img.shields.io/badge/Tauri-2-blue)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black)

## Features

- **Weekly & Daily Schedule** — plan your classes, track attendance, and view your timetable in week, day, or agenda mode
- **Academics Dashboard** — monitor subject progress, upcoming tasks, and items needing attention
- **AI Assistant** — chat with your data using Google Gemini (bring your own API key); get daily briefings, homework help, and study suggestions
- **Quick-Add** — instantly create tasks, events, or notes from anywhere in the app
- **Smart Import** — scan a timetable image/PDF and let AI extract classes automatically; sync with Google Classroom
- **Notes Library** — pin, organize, and optionally AI-summarize your notes
- **Files Manager** — keep important documents linked to subjects
- **Analytics** — see completion rates, workload distribution, and productivity insights
- **Pomodoro Timer** — built-in focus timer with notifications
- **Search** — fuzzy search across tasks, classes, notes, and files
- **Notifications** — contextual alerts for deadlines and events
- **Auto-Updates** — desktop app updates itself via GitHub Releases
- **Dark / Light / Paper themes** — switch to whatever feels best

## Tech Stack

| Layer | Technology |
|-------|------------|
| Shell | Tauri 2 (Rust) |
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (persisted to localStorage) |
| AI | Google Gemini Generative Language API (client-side) |
| Bundler | Next.js static export → Tauri webview |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Rust** ≥ 1.77 — install via [rustup](https://rustup.rs/)
- **Tauri CLI** — `npm i -g @tauri-apps/cli` (or use the local `npx tauri`)
- Platform-specific dependencies: see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
# Install JS dependencies
npm install

# Start the Tauri dev server (launches the desktop window with hot-reload)
npx tauri dev
```

> The Next.js dev server starts on port 3002 and is opened inside a native Tauri webview.

### Production Build

```bash
npx tauri build
```

The resulting installer is written to `src-tauri/target/release/bundle/`.

## Configuration

| Setting | Location | Description |
|---------|----------|-------------|
| Gemini API key | Profile → Gemini | Enables the AI assistant and timetable scanner |
| AI model | Profile → Gemini | Default: `gemini-1.5-flash` |
| Theme | Profile → Preferences | `paper`, `light`, or `dark` |
| Google Calendar | Profile → Integrations | OAuth connection for calendar sync |
| Google Classroom | Profile → Integrations | Syncs assignments into the Academics view |

All configuration is stored **locally in your browser** (via Zustand + localStorage). Nothing is sent to any server other than Google's APIs when you explicitly connect.

## Project Structure

```
├── src/
│   ├── app/            # Next.js page & layout
│   ├── components/     # Shared UI (Sidebar, Topbar, Modals, etc.)
│   ├── features/       # Feature modules (home, schedule, academics, …)
│   └── lib/            # Types, store, utilities, AI helpers
├── src-tauri/          # Tauri Rust shell
├── public/             # Static assets
├── scripts/            # Setup / test helpers
└── tests/              # Test files
```

## License

[MIT](LICENSE) — © 2026 Timely Contributors
