import { eq, sql } from "drizzle-orm";
import type { Database } from "@webify/db";
import { waybackSnapshots, waybackProductData, archiveImportJobs } from "@webify/db";
import { parseProductPage, waybackUrl } from "@webify/core";
import { createLogger } from "@webify/db";
import { TokenBucket } from "./rate-limiter";
import type { ScrapeJobMessage, ArchiveBatchSnapshot } from "./types";

const log = createLogger("archive-batch");

// 6 requests per minute to be polite to archive.org
const RATE_LIMIT_TOKENS = 6;
const RATE_LIMIT_REFILL = 0.1; // ~6 per minute

export async function handleArchiveBatch(
  db: Database,
  domain: string,
  jobId: string,
  snapshots: ArchiveBatchSnapshot[],
  queue: Queue<ScrapeJobMessage>,
): Promise<void> {
  const bucket = new TokenBucket(RATE_LIMIT_TOKENS, RATE_LIMIT_REFILL);
  const remaining: ArchiveBatchSnapshot[] = [];
  let fetched = 0;
  let failed = 0;

  for (const snap of snapshots) {
    if (!bucket.tryConsume()) {
      // Rate limit reached — queue remainder for later
      remaining.push(snap);
      continue;
    }

    try {
      const fetchUrl = waybackUrl(snap.timestamp, snap.url);
      const response = await fetch(fetchUrl, {
        headers: { "User-Agent": "Webify/1.0 (product archive research)" },
      });

      if (response.status === 429) {
        bucket.recordRateLimited();
        remaining.push(snap);
        continue;
      }

      if (!response.ok) {
        await db.update(waybackSnapshots)
          .set({
            fetchStatus: "failed",
            fetchedAt: new Date().toISOString(),
            fetchError: `HTTP ${response.status}`,
          })
          .where(eq(waybackSnapshots.id, snap.id));
        failed++;
        continue;
      }

      bucket.recordSuccess();
      const html = await response.text();
      const result = await parseProductPage(html);

      if (!result) {
        await db.update(waybackSnapshots)
          .set({
            fetchStatus: "skipped",
            fetchedAt: new Date().toISOString(),
            fetchError: "No parseable product data",
          })
          .where(eq(waybackSnapshots.id, snap.id));
        fetched++; // Count as fetched but no data
        continue;
      }

      const { strategy, product } = result;

      // Convert wayback timestamp (YYYYMMDDHHmmss) to ISO
      const ts = snap.timestamp;
      const capturedAt = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}Z`;

      // Extract handle from URL
      const handleMatch = snap.url.match(/\/products\/([^/?#]+)/);
      const handle = handleMatch ? handleMatch[1] : "";

      // Insert parsed data
      await db.insert(waybackProductData).values({
        snapshotId: snap.id,
        storeDomain: domain,
        handle,
        title: product.title,
        vendor: product.vendor,
        productType: product.productType,
        extractionStrategy: strategy,
        variantsJson: JSON.stringify(product.variants),
        imagesJson: JSON.stringify(product.images),
        videosJson: JSON.stringify(product.videos),
        rawPrice: product.rawPrice,
        capturedAt,
      });

      // Mark snapshot as fetched
      await db.update(waybackSnapshots)
        .set({ fetchStatus: "fetched", fetchedAt: new Date().toISOString() })
        .where(eq(waybackSnapshots.id, snap.id));

      fetched++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.update(waybackSnapshots)
        .set({
          fetchStatus: "failed",
          fetchedAt: new Date().toISOString(),
          fetchError: message.slice(0, 500),
        })
        .where(eq(waybackSnapshots.id, snap.id));
      failed++;
    }
  }

  // Update job counters (use SQL increment to avoid race conditions)
  if (fetched > 0 || failed > 0) {
    await db.update(archiveImportJobs)
      .set({
        fetchedSnapshots: sql`${archiveImportJobs.fetchedSnapshots} + ${fetched}`,
        failedSnapshots: sql`${archiveImportJobs.failedSnapshots} + ${failed}`,
      })
      .where(eq(archiveImportJobs.id, jobId));
  }

  // Re-enqueue remaining snapshots if any
  if (remaining.length > 0) {
    await queue.send({
      type: "archive_batch",
      domain,
      jobId,
      snapshots: remaining,
    });
    log.info("archive batch re-enqueued", { domain, jobId, remaining: remaining.length });
  }

  // Check if job is complete
  const job = await db.query.archiveImportJobs.findFirst({
    where: { id: jobId },
  });
  if (job && remaining.length === 0) {
    const totalProcessed = job.fetchedSnapshots + job.failedSnapshots;
    if (totalProcessed >= job.totalSnapshots) {
      await db.update(archiveImportJobs)
        .set({ status: "completed", completedAt: new Date().toISOString() })
        .where(eq(archiveImportJobs.id, jobId));
      log.info("archive import completed", { domain, jobId, total: job.totalSnapshots });
    }
  }

  log.info("archive batch processed", { domain, jobId, fetched, failed, remaining: remaining.length });
}
