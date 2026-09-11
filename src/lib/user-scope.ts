/**
 * Which browser storage holds user-specific data.
 *
 * Anything listed here is either keyed per user (so two accounts in the same
 * browser can never read each other's copy) or wiped on sign-out. OAuth
 * tokens, AI keys, study sessions and AI-generated suggestions are all
 * user-specific, so they must never survive an account switch.
 */

/** Keys that are cleared whenever the signed-in user changes or signs out. */
const USER_SCOPED_KEYS = [
  // store + onboarding
  "timely-store-v1",
  "timely-onboarded",
  // The "remember me" choice is a browser preference, not account data, but
  // signing out resets it — that has been the log-out button's behaviour since
  // before this audit (Sidebar.tsx), and the two paths must agree.
  "timely_remember_me",
  // legacy duplicate AI config (written by an older build)
  "timely_ai_config",
  // Google Classroom
  "timely_gc_client_id",
  "timely_google_token",
  "timely_google_courses",
  // Google Calendar
  "timely_google_calendar_token",
  "timely_google_calendar_client_id",
  // Google Drive
  "timely_gdrive_token",
  "timely_gdrive_client_id",
  "timely_gdrive_folder_id",
];

/** Prefixes of keys that are namespaced per user id (`prefix:userId`). */
const USER_SCOPED_PREFIXES = [
  "timely_pomodoro",
  "timely-schedule-suggestions",
];

/** Build a per-user storage key, e.g. `timely_pomodoro:<userId>`. */
export function scopedKey(base: string, userId: string | null | undefined): string {
  return `${base}:${userId || "signed-out"}`;
}

/** Remove every user-scoped key, including per-user namespaced ones. */
export function clearUserScopedStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of USER_SCOPED_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
    for (const prefix of USER_SCOPED_PREFIXES) {
      for (const storage of [window.localStorage, window.sessionStorage]) {
        const victims: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (key === prefix || key.startsWith(`${prefix}:`))) {
            victims.push(key);
          }
        }
        victims.forEach((key) => storage.removeItem(key));
      }
    }
  } catch {
    // Storage can be unavailable (private mode); nothing to clear.
  }
}
