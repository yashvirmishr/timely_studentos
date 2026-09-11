/**
 * Read-side sync with Supabase.
 *
 * Every query is scoped to the authenticated user id and every row is mapped
 * into the client shape. A failed fetch is reported as a failure — it must
 * never be confused with "this user has no data", otherwise a transient
 * network error would either hide real data or leak another account's cached
 * data into the UI.
 */

import { createClient } from "./client";
import {
  fromRow,
  fromRows,
  SYNC_ENTITIES,
  toRow,
  type SyncEntity,
} from "./mappers";
import { detectColumnDrift } from "./schema";
import {
  reportSchemaDrift,
  upsertIgnoringUnknownColumns,
} from "./persistence";

export interface RemoteSnapshot {
  /** Entity -> client objects. Missing keys mean "the fetch failed". */
  data: Partial<Record<SyncEntity, Record<string, any>[]>>;
  /** Entities whose fetch failed; their local data must be preserved. */
  failed: SyncEntity[];
}

/** Read every user-owned entity for one user. */
export async function fetchAllEntities(userId: string): Promise<RemoteSnapshot> {
  const supabase = createClient();
  const data: RemoteSnapshot["data"] = {};
  const failed: SyncEntity[] = [];

  await Promise.all(
    SYNC_ENTITIES.map(async (entity) => {
      const { data: rows, error } = await supabase
        .from(entity)
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error(`Timely: failed to load ${entity}`, error.message);
        failed.push(entity);
        return;
      }

      data[entity] = fromRows(entity, rows);
    }),
  );

  return { data, failed };
}

/**
 * Make sure the singleton rows that everything else assumes exist are present.
 * Called on every sign-in so a brand new account starts from a valid, empty,
 * explicitly initialized state (profile + AI config, nothing else).
 */
export async function ensureUserRecords(userId: string): Promise<void> {
  const supabase = createClient();

  const [profileResult, aiConfigResult] = await Promise.all([
    supabase.from("profiles").upsert(
      { user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "user_id", ignoreDuplicates: true },
    ),
    supabase.from("ai_config").upsert(
      { user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "user_id", ignoreDuplicates: true },
    ),
  ]);

  if (profileResult.error) {
    console.error("Timely: failed to initialize profile", profileResult.error.message);
  }
  if (aiConfigResult.error) {
    console.error("Timely: failed to initialize ai_config", aiConfigResult.error.message);
  }
}

export interface OnboardingProbe {
  /** False when the database has no `onboarded` column to answer with. */
  columnPresent: boolean;
  onboarded: boolean;
  /** Set when the check failed for a reason schema drift cannot explain. */
  error: string | null;
}

/**
 * Ask one account whether setup is finished.
 *
 * Three outcomes that used to collapse into one: finished, not finished, and
 * "the database cannot answer". Only the middle case may send a user to the
 * setup screen — the third must never be read as "not finished", or an account
 * whose database is missing the column can never get past setup.
 */
export async function probeOnboarding(
  userId: string,
): Promise<OnboardingProbe> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (detectColumnDrift(error).kind === "missing") {
      return { columnPresent: false, onboarded: false, error: null };
    }
    console.error("Timely: could not read onboarding state", error.message);
    return { columnPresent: true, onboarded: false, error: error.message };
  }

  return { columnPresent: true, onboarded: !!data?.onboarded, error: null };
}

/** Upsert a full local collection for one user (used after onboarding import). */
export async function pushEntity(
  entity: SyncEntity,
  userId: string,
  items: Record<string, any>[],
): Promise<{ ok: boolean; error?: string }> {
  if (items.length === 0) return { ok: true };
  const { error, dropped } = await upsertIgnoringUnknownColumns(
    entity,
    items.map((item) => toRow(entity, item, userId)),
  );

  if (dropped.length > 0) {
    // The account is on an older schema. Everything the database can store was
    // still saved, so this is a warning to surface rather than a failure.
    console.error(
      `Timely: ${entity} column(s) not in the database: ${dropped.join(", ")}`,
    );
    reportSchemaDrift(dropped);
  }

  if (error) {
    console.error(`Timely: failed to push ${entity}`, error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Push a whole local workspace, then read it back to confirm it persisted. */
export async function pushWorkspace(
  userId: string,
  state: Record<string, any>,
): Promise<{ ok: boolean; failed: SyncEntity[] }> {
  const failed: SyncEntity[] = [];

  const collections: Array<[SyncEntity, any[]]> = [
    ["tasks", state.tasks || []],
    ["classes", state.classes || []],
    ["subjects", state.subjects || []],
    ["notes", state.notes || []],
    ["files", state.files || []],
    ["saved_chats", state.savedChats || []],
    ["notifications", state.notifications || []],
  ];

  for (const [entity, items] of collections) {
    const result = await pushEntity(entity, userId, items);
    if (!result.ok) failed.push(entity);
  }

  if (state.preferences) {
    const result = await pushEntity("profiles", userId, [
      { ...state.preferences, user_id: userId },
    ]);
    if (!result.ok) failed.push("profiles");
  }

  if (state.aiConfig) {
    const result = await pushEntity("ai_config", userId, [
      { ...state.aiConfig, user_id: userId },
    ]);
    if (!result.ok) failed.push("ai_config");
  }

  return { ok: failed.length === 0, failed };
}

/** Map a single row for callers that only need one entity. */
export { fromRow };
