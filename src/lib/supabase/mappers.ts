/**
 * Row <-> client mapping for every user-owned entity.
 *
 * The database uses snake_case columns while the client uses camelCase fields.
 * Sending client objects straight to Supabase silently failed for any entity
 * with a multi-word field (classes.google_calendar_id, notes.has_ai_summary,
 * subjects.tasks_due, files.drive_file_id, profiles.profile_name,
 * ai_config.api_key, saved_chats.created_at). This module is the single place
 * that translates between the two shapes.
 */

export type SyncEntity =
  | "tasks"
  | "classes"
  | "subjects"
  | "notes"
  | "files"
  | "saved_chats"
  | "notifications"
  | "profiles"
  | "ai_config";

export const SYNC_ENTITIES: SyncEntity[] = [
  "tasks",
  "classes",
  "subjects",
  "notes",
  "files",
  "saved_chats",
  "notifications",
  "profiles",
  "ai_config",
];

/** Entities that are one-row-per-user rather than a collection. */
export const SINGLETON_ENTITIES: SyncEntity[] = ["profiles", "ai_config"];

/** The column singleton entities conflict on: one row per user, keyed by it. */
export const SINGLETON_ID_FIELD = "user_id";

/** camelCase (client) -> snake_case (database column) */
const CAMEL_TO_COLUMN: Record<SyncEntity, Record<string, string>> = {
  tasks: {},
  classes: { googleCalendarId: "google_calendar_id", allDay: "all_day" },
  subjects: { tasksDue: "tasks_due" },
  notes: { hasAiSummary: "has_ai_summary" },
  files: { driveFileId: "drive_file_id" },
  saved_chats: { createdAt: "created_at", updatedAt: "updated_at" },
  notifications: {},
  profiles: { profileName: "profile_name", reduceMotion: "reduce_motion" },
  ai_config: { apiKey: "api_key" },
};

/** Columns that may be written for each entity. Anything else is dropped. */
const WRITABLE_COLUMNS: Record<SyncEntity, string[]> = {
  tasks: [
    "id", "title", "subject", "due", "time", "priority",
    "completed", "custom", "notes", "remind",
  ],
  classes: [
    "id", "subject", "teacher", "room", "day", "start", "end", "color",
    "checked", "imported", "google_calendar_id", "all_day",
  ],
  subjects: [
    "id", "name", "teacher", "room", "symbol", "color",
    "preparedness", "tasks_due", "tag", "urgent",
  ],
  notes: [
    "id", "subject", "ago", "title", "preview", "color",
    "pinned", "has_ai_summary", "body", "footer",
  ],
  files: [
    "id", "name", "type", "subject", "updated", "size", "drive_file_id",
  ],
  saved_chats: ["id", "title", "messages", "created_at", "updated_at"],
  notifications: ["id", "tone", "icon", "title", "detail", "read"],
  profiles: [
    "profile_name", "theme", "reduce_motion", "notifications", "onboarded",
  ],
  ai_config: ["api_key", "model", "enabled"],
};

export function idFieldFor(entity: SyncEntity): string {
  return SINGLETON_ENTITIES.includes(entity) ? SINGLETON_ID_FIELD : "id";
}

function invert(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
}

/** Convert one client object into a database row (column whitelist applied). */
export function toRow(
  entity: SyncEntity,
  item: Record<string, any>,
  userId?: string,
): Record<string, any> {
  const map = CAMEL_TO_COLUMN[entity];
  const allowed = WRITABLE_COLUMNS[entity];
  const row: Record<string, any> = {};

  for (const [key, value] of Object.entries(item)) {
    if (value === undefined) continue;
    const column = map[key] || key;
    if (!allowed.includes(column)) continue;
    row[column] = value;
  }

  if (userId) row.user_id = userId;
  return row;
}

/** Convert one database row back into the client object shape. */
export function fromRow(
  entity: SyncEntity,
  row: Record<string, any>,
): Record<string, any> {
  const map = invert(CAMEL_TO_COLUMN[entity]);
  const item: Record<string, any> = {};

  for (const [column, value] of Object.entries(row)) {
    if (column === "user_id" || column === "updated_at") continue;
    if (column === "created_at" && entity !== "saved_chats") continue;
    item[map[column] || column] = value;
  }

  return item;
}

/** Map a whole collection of rows into client objects. */
export function fromRows(
  entity: SyncEntity,
  rows: Record<string, any>[] | null | undefined,
): Record<string, any>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => fromRow(entity, row));
}
