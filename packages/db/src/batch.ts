import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "./queries";

/** A single prepared Drizzle query for db.batch(). */
export type WriteOp = BatchItem<"sqlite">;

/** D1 limits bound parameters to 100 per prepared statement. */
export const D1_MAX_PARAMS = 100;

/** Max statements per db.batch() call (each call = 1 D1 transaction). */
export const BATCH_CHUNK_SIZE = 100;

/**
 * Execute writes in chunked db.batch() calls.
 * Each chunk is an independent D1 transaction — if a statement
 * in chunk N fails, chunk N rolls back but prior chunks are committed.
 */
export async function batchExecute(db: Database, writes: WriteOp[]): Promise<void> {
  if (writes.length === 0) return;
  for (let i = 0; i < writes.length; i += BATCH_CHUNK_SIZE) {
    const chunk = writes.slice(i, i + BATCH_CHUNK_SIZE);
    if (chunk.length === 1) {
      await chunk[0];
    } else {
      await db.batch(chunk as [WriteOp, ...WriteOp[]]);
    }
  }
}

/** Split rows into chunks respecting D1's 100-param-per-statement limit. */
export function chunkByParams<T>(rows: T[], paramsPerRow: number): T[][] {
  if (rows.length === 0) return [];
  const chunkSize = Math.floor(D1_MAX_PARAMS / paramsPerRow);
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }
  return chunks;
}
