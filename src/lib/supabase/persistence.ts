/**
 * Write-through persistence for user-owned entities.
 *
 * Every store mutation queues an upsert/delete here, scoped to the
 * authenticated user id. Writes are batched (400ms) so rapid typing or slider
 * drags do not spam the network, and failed batches are retried on the next
 * flush instead of being dropped silently.
 *
 * This module is the only place that writes to Supabase from the client.
 */

import { createClient } from "./client";
import { idFieldFor, toRow, type SyncEntity } from "./mappers";
import { detectColumnDrift, schemaDriftMessage } from "./schema";

interface PendingUpsert {
  entity: SyncEntity;
  userId: string;
  row: Record<string, any>;
}

interface PendingDelete {
  entity: SyncEntity;
  userId: string;
  id: string;
}

const WRITE_DEBOUNCE_MS = 400;

/** Stop stripping after a few rounds so a pathological error cannot loop. */
const MAX_DROPPED_COLUMNS = 4;

let pendingUpserts = new Map<string, PendingUpsert>();
let pendingDeletes = new Map<string, PendingDelete>();
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
let errorHandler: ((entity: SyncEntity, message: string) => void) | null = null;
let notifier: (() => void) | null = null;
let driftHandler: ((message: string) => void) | null = null;

/** Register a callback for persistence failures (surfaced in the UI). */
export function setPersistenceErrorHandler(
  handler: ((entity: SyncEntity, message: string) => void) | null,
) {
  errorHandler = handler;
}

/** Register a callback fired whenever a write is successfully flushed. */
export function setPersistenceNotifier(handler: (() => void) | null) {
  notifier = handler;
}

/**
 * Register a callback fired when the database rejects a column this build knows
 * about — i.e. a migration has not been applied yet. Distinct from the error
 * handler because it stays true until the schema changes.
 */
export function setSchemaDriftHandler(handler: ((message: string) => void) | null) {
  driftHandler = handler;
}

function key(entity: SyncEntity, id: string) {
  return `${entity}:${id}`;
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flushPersistence();
  }, WRITE_DEBOUNCE_MS);
}

/** Report columns the database rejected, so the UI can tell the user to migrate. */
export function reportSchemaDrift(columns: string[]): void {
  if (columns.length === 0) return;
  driftHandler?.(schemaDriftMessage(columns.join(", ")));
}

/**
 * Upsert rows, dropping any column this database does not have.
 *
 * A single unmigrated column must not fail the whole batch: that hides the
 * columns that ARE writable and makes the write retry forever. Dropped columns
 * are returned so the caller can surface the drift.
 */
export async function upsertIgnoringUnknownColumns(
  entity: SyncEntity,
  input: Record<string, any>[],
): Promise<{
  error: { message: string } | null;
  dropped: string[];
  rows: Record<string, any>[];
}> {
  const supabase = createClient();
  const idField = idFieldFor(entity);
  const dropped: string[] = [];
  let rows = input;

  let { error } = await supabase
    .from(entity)
    .upsert(rows, { onConflict: idField });

  while (error && dropped.length < MAX_DROPPED_COLUMNS) {
    const drift = detectColumnDrift(error);
    if (drift.kind !== "missing") break;
    const column = drift.column;
    if (!column || dropped.includes(column)) break;
    dropped.push(column);

    rows = rows.map((row) => {
      const copy = { ...row };
      delete copy[column];
      return copy;
    });

    // Whatever is left that this database can actually store.
    const storable = rows.filter((row) =>
      Object.keys(row).some((k) => k !== idField && k !== "user_id"),
    );
    if (storable.length === 0) return { error: null, dropped, rows: [] };
    rows = storable;

    ({ error } = await supabase
      .from(entity)
      .upsert(rows, { onConflict: idField }));
  }

  return { error: error ? { message: error.message } : null, dropped, rows };
}

/** Queue a create/update for a single user-owned record. */
export function queueUpsert(
  entity: SyncEntity,
  userId: string | null,
  item: Record<string, any>,
) {
  if (!userId) return;
  const idField = idFieldFor(entity);
  const id = item[idField] ?? item.id;
  if (!id) return;

  const row = toRow(entity, item, userId);
  const entry = key(entity, String(id));
  pendingUpserts.set(entry, { entity, userId, row });
  // A delete queued earlier for the same record is superseded by this write.
  pendingDeletes.delete(entry);
  schedule();
}

/** Queue a delete for a single user-owned record. */
export function queueDelete(
  entity: SyncEntity,
  userId: string | null,
  id: string,
) {
  if (!userId || !id) return;
  const entry = key(entity, id);
  pendingUpserts.delete(entry);
  pendingDeletes.set(entry, { entity, userId, id });
  schedule();
}

/** Queue several upserts at once (bulk import / onboarding). */
export function queueUpsertMany(
  entity: SyncEntity,
  userId: string | null,
  items: Record<string, any>[],
) {
  for (const item of items) queueUpsert(entity, userId, item);
}

/** Discard queued writes, e.g. after signing out or switching accounts. */
export function resetPersistenceQueue() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  pendingUpserts = new Map();
  pendingDeletes = new Map();
}

/**
 * Flush all queued writes. Safe to call concurrently — overlapping calls share
 * the same in-flight promise.
 */
export async function flushPersistence(): Promise<void> {
  if (inFlight) return inFlight;

  if (pendingUpserts.size === 0 && pendingDeletes.size === 0) return;

  const upserts = Array.from(pendingUpserts.values());
  const deletes = Array.from(pendingDeletes.values());
  const failedUpserts: PendingUpsert[] = [];
  const failedDeletes: PendingDelete[] = [];

  const promise = (async () => {
    const supabase = createClient();
    let wrote = false;

    // Group upserts per entity so each table gets a single round trip.
    const byEntity = new Map<
      SyncEntity,
      { userId: string; rows: Record<string, any>[] }
    >();
    for (const item of upserts) {
      const group = byEntity.get(item.entity) || {
        userId: item.userId,
        rows: [],
      };
      group.rows.push(item.row);
      byEntity.set(item.entity, group);
    }

    for (const [entity, group] of byEntity) {
      const result = await upsertIgnoringUnknownColumns(entity, group.rows);

      if (result.dropped.length > 0) {
        console.error(
          `Timely: ${entity} column(s) not in the database: ${result.dropped.join(", ")}`,
        );
        reportSchemaDrift(result.dropped);
      }

      if (result.error) {
        // Re-queue only the rows this database could not accept, so a retry does
        // not repeat a write that can never succeed.
        for (const row of result.rows) {
          failedUpserts.push({ entity, userId: group.userId, row });
        }
        errorHandler?.(entity, result.error.message);
      } else if (result.rows.length > 0) {
        wrote = true;
      }
    }

    for (const item of deletes) {
      const { error } = await supabase
        .from(item.entity)
        .delete()
        .eq(idFieldFor(item.entity), item.id)
        .eq("user_id", item.userId);

      if (error) {
        failedDeletes.push(item);
        errorHandler?.(item.entity, error.message);
      } else {
        wrote = true;
      }
    }

    // Re-queue anything that failed so the next flush retries it.
    for (const item of failedUpserts) {
      const entry = key(item.entity, String(item.row[idFieldFor(item.entity)]));
      if (!pendingUpserts.has(entry)) pendingUpserts.set(entry, item);
    }
    for (const item of failedDeletes) {
      const entry = key(item.entity, item.id);
      if (!pendingDeletes.has(entry)) pendingDeletes.set(entry, item);
    }

    if (wrote) notifier?.();
    if (failedUpserts.length || failedDeletes.length) schedule();
  })();

  inFlight = promise;
  try {
    await promise;
  } finally {
    if (inFlight === promise) inFlight = null;
  }
}
