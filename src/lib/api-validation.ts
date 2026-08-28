/**
 * Input validation helpers for API routes.
 * Prevents mass assignment by whitelisting allowed fields per entity type.
 */

type AllowedFields = Record<string, readonly string[]>;

/** Allowed fields for each entity type (POST create) */
const CREATE_FIELDS: AllowedFields = {
  tasks: ['id', 'title', 'subject', 'due', 'time', 'priority', 'completed', 'custom', 'notes'],
  classes: ['id', 'subject', 'teacher', 'room', 'day', 'start', 'end', 'color', 'checked', 'imported', 'google_calendar_id', 'all_day'],
  subjects: ['id', 'name', 'teacher', 'room', 'symbol', 'color', 'preparedness', 'tasks_due', 'tag', 'urgent'],
  notes: ['id', 'subject', 'ago', 'title', 'preview', 'color', 'pinned', 'has_ai_summary', 'body', 'footer'],
  files: ['id', 'name', 'type', 'subject', 'updated', 'size'],
  saved_chats: ['id', 'title', 'messages', 'created_at', 'updated_at'],
  notifications: ['id', 'tone', 'icon', 'title', 'detail', 'read'],
  ai_config: ['model', 'enabled', 'api_key'],
  profiles: ['profile_name', 'theme', 'reduce_motion', 'notifications'],
};

/** Allowed fields for each entity type (PUT update) */
const UPDATE_FIELDS: AllowedFields = {
  tasks: ['title', 'subject', 'due', 'time', 'priority', 'completed', 'custom', 'notes'],
  classes: ['subject', 'teacher', 'room', 'day', 'start', 'end', 'color', 'checked', 'imported', 'google_calendar_id', 'all_day'],
  subjects: ['name', 'teacher', 'room', 'symbol', 'color', 'preparedness', 'tasks_due', 'tag', 'urgent'],
  notes: ['subject', 'ago', 'title', 'preview', 'color', 'pinned', 'has_ai_summary', 'body', 'footer'],
  files: ['name', 'type', 'subject', 'updated', 'size'],
  saved_chats: ['title', 'messages', 'created_at', 'updated_at'],
  notifications: ['tone', 'icon', 'title', 'detail', 'read'],
  ai_config: ['model', 'enabled', 'api_key'],
  profiles: ['profile_name', 'theme', 'reduce_motion', 'notifications'],
};

/** Pick only allowed fields from a request body. Strips everything else. */
export function pickFields(entity: string, body: Record<string, unknown>, mode: 'create' | 'update' = 'create'): Record<string, unknown> {
  const fields = mode === 'create' ? CREATE_FIELDS[entity] : UPDATE_FIELDS[entity];
  if (!fields) return body;
  
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    if (key in body) {
      result[key] = body[key];
    }
  }
  return result;
}
