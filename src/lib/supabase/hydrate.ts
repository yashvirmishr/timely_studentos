/**
 * Pure snapshot -> state-patch logic.
 *
 * Kept separate from the store so the isolation rules can be verified directly:
 *
 *  1. An entity that loaded successfully is applied even when it is empty —
 *     otherwise the previous account's cached rows would survive a switch.
 *  2. An entity whose fetch FAILED is left untouched — a network error must not
 *     look like "this user has no data" and wipe the workspace.
 *  3. The profile row is the only source of truth for the display name, theme,
 *     and whether onboarding is finished.
 */

import type { RemoteSnapshot } from "./sync";
import type { AiConfig, Preferences } from "../types";
import { hasColumn, schemaDriftMessage } from "./schema";

export interface HydrationPatch {
  tasks?: unknown[];
  classes?: unknown[];
  subjects?: unknown[];
  notes?: unknown[];
  files?: unknown[];
  savedChats?: unknown[];
  notifications?: unknown[];
  preferences?: Preferences;
  aiConfig?: AiConfig;
  onboarded?: boolean;
  /** False when the database could not be asked whether setup is finished. */
  onboardedKnown?: boolean;
  /** Set when the database is missing a column this build expects. */
  schemaWarning?: string | null;
  profileLoaded?: boolean;
  syncError?: string | null;
}

export const EMPTY_PREFERENCES: Preferences = {
  notifications: true,
  theme: "paper",
  reduceMotion: false,
  profileName: "",
  educationSystem: "general",
  schoolYear: "",
  examSession: "none",
  dailyStudyGoal: 0,
  termLabel: "",
};

export const EMPTY_AI_CONFIG: AiConfig = {
  apiKey: "",
  model: "gemini-2.5-flash",
  enabled: false,
};

interface ProfileRow {
  profileName?: string;
  theme?: Preferences["theme"];
  reduceMotion?: boolean;
  notifications?: boolean;
  onboarded?: boolean;
  educationSystem?: Preferences["educationSystem"];
  schoolYear?: string;
  examSession?: Preferences["examSession"];
  dailyStudyGoal?: number;
  termLabel?: string;
}

interface AiConfigRow {
  apiKey?: string;
  model?: string;
  enabled?: boolean;
}

/**
 * The `onboarded` column the client needs in order to answer "has this account
 * finished setup?". Kept here so the fallback path and any warning can name it.
 */
export const ONBOARDED_COLUMN = "profiles.onboarded";

export function buildHydrationPatch(
  snapshot: RemoteSnapshot,
  current: { profileLoaded: boolean; localOnboarded?: boolean },
): HydrationPatch {
  const { data, failed } = snapshot;
  const loaded = (entity: keyof RemoteSnapshot["data"]) =>
    !failed.includes(entity) && Array.isArray(data[entity]);

  const patch: HydrationPatch = {
    // A failed profile fetch must not look like "this account is brand new".
    profileLoaded: loaded("profiles") ? true : current.profileLoaded,
    syncError:
      failed.length > 0
        ? `Could not load your ${failed.join(", ")}. Check your connection and retry.`
        : null,
  };

  if (loaded("tasks")) patch.tasks = data.tasks;
  if (loaded("classes")) patch.classes = data.classes;
  if (loaded("subjects")) patch.subjects = data.subjects;
  if (loaded("notes")) patch.notes = data.notes;
  if (loaded("files")) patch.files = data.files;
  if (loaded("saved_chats")) patch.savedChats = data.saved_chats;
  if (loaded("notifications")) patch.notifications = data.notifications;

  if (loaded("profiles")) {
    const profile = ((data.profiles || [])[0] || undefined) as
      | ProfileRow
      | undefined;
    patch.preferences = profile
      ? {
          notifications: profile.notifications !== false,
          theme: profile.theme ?? EMPTY_PREFERENCES.theme,
          reduceMotion: !!profile.reduceMotion,
          profileName: profile.profileName ?? "",
          educationSystem: profile.educationSystem ?? "general",
          schoolYear: profile.schoolYear ?? "",
          examSession: profile.examSession ?? "none",
          dailyStudyGoal: profile.dailyStudyGoal ?? 0,
          termLabel: profile.termLabel ?? "",
        }
      : { ...EMPTY_PREFERENCES };

    if (!profile) {
      // No profile row at all means this account has never completed setup.
      patch.onboarded = false;
      patch.onboardedKnown = true;
      patch.schemaWarning = null;
    } else if (hasColumn(profile, "onboarded")) {
      patch.onboarded = !!profile.onboarded;
      patch.onboardedKnown = true;
      patch.schemaWarning = null;
    } else {
      // The column is absent, so the database cannot answer the question. Report
      // "unknown" and keep this account's own last answer: answering `false`
      // here is exactly what trapped new accounts on the setup screen forever.
      patch.onboarded = current.localOnboarded ?? false;
      patch.onboardedKnown = false;
      patch.schemaWarning = schemaDriftMessage(ONBOARDED_COLUMN);
    }
  }

  if (loaded("ai_config")) {
    const config = ((data.ai_config || [])[0] || undefined) as
      | AiConfigRow
      | undefined;
    patch.aiConfig = config
      ? {
          apiKey: config.apiKey ?? "",
          model: config.model || EMPTY_AI_CONFIG.model,
          enabled: !!config.enabled,
        }
      : { ...EMPTY_AI_CONFIG };
  }

  return patch;
}
