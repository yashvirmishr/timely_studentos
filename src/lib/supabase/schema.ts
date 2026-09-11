/**
 * Schema-drift detection.
 *
 * The database can be older than the code when a migration has not been applied
 * yet. PostgREST then rejects the column instead of ignoring it, and the client
 * used to read that rejection as "the value is false". For
 * `profiles.onboarded` that meant a brand new account was sent back to the setup
 * screen on every load, with nothing on screen explaining why.
 *
 * Drift is therefore detected explicitly and reported, never guessed at.
 */

/** Postgres `undefined_column` — returned when selecting an absent column. */
const PG_UNDEFINED_COLUMN = "42703";
/** PostgREST schema-cache miss — returned when writing an absent column. */
const PGRST_UNKNOWN_COLUMN = "PGRST204";

export type ColumnDrift =
  /** The error has nothing to do with a missing column. */
  | { kind: "none" }
  /** The column does not exist. `column` is null if the message did not name it. */
  | { kind: "missing"; column: string | null };

const NONE: ColumnDrift = { kind: "none" };

/** Pull `onboarded` out of the two shapes PostgREST uses to report drift. */
function columnNameFrom(message: string): string | null {
  const pg = message.match(/column\s+"?([\w.]+)"?\s+does not exist/i);
  if (pg) return pg[1].split(".").pop() ?? null;

  const cache = message.match(/Could not find the '([^']+)' column/i);
  if (cache) return cache[1];

  return null;
}

/**
 * Classify an error as "this column is missing from the database" or not.
 *
 * Checking the message as well as the code matters: PostgREST reports an absent
 * column differently for reads (42703) than for writes (PGRST204), and a proxy
 * can strip the code entirely.
 */
export function detectColumnDrift(error: unknown): ColumnDrift {
  if (!error || typeof error !== "object") return NONE;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const text = typeof message === "string" ? message : "";

  const codeMatches =
    code === PG_UNDEFINED_COLUMN || code === PGRST_UNKNOWN_COLUMN;
  const messageMatches =
    /column\s+"?[\w.]+"?\s+does not exist/i.test(text) ||
    /Could not find the '[^']+' column/i.test(text);

  if (!codeMatches && !messageMatches) return NONE;
  return { kind: "missing", column: columnNameFrom(text) };
}

/**
 * Did the fetched row actually carry this column?
 *
 * `fromRow` copies every column the database returned, so an absent key is proof
 * the column does not exist — a real column that is simply unset comes back as
 * `null` and still has the key.
 */
export function hasColumn(
  row: Record<string, any> | null | undefined,
  column: string,
): boolean {
  return !!row && Object.prototype.hasOwnProperty.call(row, column);
}

/** Actionable, user-facing explanation of what is wrong and what to run. */
export function schemaDriftMessage(column: string): string {
  return (
    `Your database is missing the "${column}" column, so that setting cannot be ` +
    `saved to your account. Run the migration at the bottom of supabase-schema.sql.`
  );
}
