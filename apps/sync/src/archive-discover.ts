import { eq } from "drizzle-orm";
import type { Database } from "@webify/db";
import { waybackSnapshots, archiveImportJobs } from "@webify/db";
import { queryCdx, deduplicateByDigestDay } from "@webify/core";
import { createLogger } from "@webify/db";
import type { ScrapeJobMessage, ArchiveBatchSnapshot } from "./types";

const log = createLogger("archive-discover");
const BATCH_SIZE = 50;

export async function handleArchiveDiscover(
  db: Database,
  domain: string,
  jobId: string,
  queue: Queue<ScrapeJobMessage>,
): Promise<void> {
  try {
    // Query CDX API for all product page snapshots
    const rawSnapshots = await queryCdx({ domain });
    const deduped = deduplicateByDigestDay(rawSnapshots);

    log.info("CDX query complete", {
      domain,
      jobId,
      raw: rawSnapshots.length,
      deduped: deduped.length,
    });

    if (deduped.length === 0) {
      await db.update(archiveImportJobs)
        .set({ status: "completed", totalSnapshots: 0, completedAt: new Date().toISOString() })
        .where(eq(archiveImportJobs.id, jobId));
      return;
    }

    // Check which snapshots we already have (by digest + timestamp)
    const existingSnaps = await db.query.waybackSnapshots.findMany({
      where: { storeDomain: domain },
    });
    const existingKeys = new Set(existingSnaps.map(s => `${s.digest}:${s.timestamp}`));
    const newSnapshots = deduped.filter(s => !existingKeys.has(`${s.digest}:${s.timestamp}`));

    // Insert new snapshots in chunks (D1 100-param limit)
    // 11 params per row: storeDomain, url, handle, timestamp, digest, statusCode, mimeType, length, fetchStatus, fetchedAt, fetchError
    const PARAMS_PER_ROW = 11;
    const CHUNK_SIZE = Math.floor(100 / PARAMS_PER_ROW);

    for (let i = 0; i < newSnapshots.length; i += CHUNK_SIZE) {
      const chunk = newSnapshots.slice(i, i + CHUNK_SIZE);
      await db.insert(waybackSnapshots).values(
        chunk.map(snap => ({
          storeDomain: domain,
          url: snap.url,
          handle: snap.handle,
          timestamp: snap.timestamp,
          digest: snap.digest,
          statusCode: snap.statusCode,
          mimeType: snap.mimeType,
          length: snap.length,
          fetchStatus: "pending" as const,
        })),
      );
    }

    // Re-fetch the inserted snapshots to get their IDs
    const pendingSnaps = await db.query.waybackSnapshots.findMany({
      where: { storeDomain: domain, fetchStatus: "pending" },
      orderBy: { timestamp: "asc" },
    });

    // Update job with total count and move to fetching status
    await db.update(archiveImportJobs)
      .set({ status: "fetching", totalSnapshots: pendingSnaps.length })
      .where(eq(archiveImportJobs.id, jobId));

    // Fan out into batches of BATCH_SIZE
    for (let i = 0; i < pendingSnaps.length; i += BATCH_SIZE) {
      const batch = pendingSnaps.slice(i, i + BATCH_SIZE);
      await queue.send({
        type: "archive_batch",
        domain,
        jobId,
        snapshots: batch.map(s => ({
          id: s.id,
          timestamp: s.timestamp,
          url: s.url,
        })),
      });
    }

    log.info("archive discover fan-out", {
      domain,
      jobId,
      snapshots: pendingSnaps.length,
      batches: Math.ceil(pendingSnaps.length / BATCH_SIZE),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(archiveImportJobs)
      .set({ status: "failed", completedAt: new Date().toISOString() })
      .where(eq(archiveImportJobs.id, jobId));
    log.error("archive discover failed", { domain, jobId, error: message });
    throw error;
  }
}
