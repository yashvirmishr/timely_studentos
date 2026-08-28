# Contributing to Timely

Thanks for your interest in contributing to Timely! This guide will help you get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/timely_studentos.git
   cd timely_studentos
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Start** the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes
3. Run the linter and build to verify:
   ```bash
   npm run lint
   npm run build
   ```
4. Commit with a clear message (see below)
5. Push and open a Pull Request

## Commit Messages

Use clear, descriptive commit messages. We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — a new feature
- `fix:` — a bug fix
- `docs:` — documentation changes
- `style:` — formatting, missing semicolons, etc.
- `refactor:` — code restructuring without changing behaviour
- `test:` — adding or updating tests
- `chore:` — maintenance tasks

Examples:
```
feat: add dark mode toggle to profile
fix: correct timeline NOW line positioning
docs: update README with installation steps
```

## Project Structure

```
src/
  app/          — Next.js app router, pages, global CSS
  components/   — Reusable UI components (Sidebar, Topbar, modals, etc.)
  features/     — Feature views (home, schedule, academics, assistant, notes, files, analytics, profile)
  lib/          — Utilities, store (Zustand), types, AI integration
```

## Tech Stack

- **Framework:** Next.js 14 (React 18)
- **State:** Zustand with localStorage persistence
- **Styling:** Vanilla CSS (globals.css) + Tailwind
- **Desktop:** Tauri v2
- **AI:** Google Gemini API (client-side)

## Code Style

- TypeScript for all new code
- Use existing component patterns and naming conventions
- Keep CSS in `globals.css` — follow the existing spacing scale (`clamp()` fluid values)
- No comments unless asked
- Follow existing import order and file organization

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include a clear description of what changed and why
- Make sure `npm run lint` and `npm run build` pass
- Add screenshots for UI changes
- Link any related issues

## Reporting Bugs

Open an issue using the **Bug Report** template. Include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser and OS
- Screenshots if applicable

## Requesting Features

Open an issue using the **Feature Request** template. Describe the problem you're trying to solve, not just the solution you want.

## Licence

By contributing, you agree that your contributions will be licensed under the [MIT Licence](LICENSE).
