// Archive batch fetch handler — thin IO shell

import { eq } from "drizzle-orm";
import type { Database } from "@webify/db";
import { archiveImportJobs } from "@webify/db";
import { parseProductPage } from "@webify/core/parsing";
import { waybackUrl, waybackTimestampToISO, extractProductHandle } from "@webify/core/clients/cdx";
import { batchExecute } from "@webify/db/batch";
import { createLogger } from "@webify/db";
import { TokenBucket } from "../rate-limiter";
import type { ScrapeJobMessage, ArchiveBatchSnapshot } from "../types";
import {
  type ArchiveFetchResult,
  archiveFetchResultsToWriteOps,
  materializeArchiveWrites,
} from "./writes";

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
  const results: ArchiveFetchResult[] = [];

  // 1. Fetch + parse loop (IO, collects results without writing)
  for (const snap of snapshots) {
    if (!bucket.tryConsume()) {
      remaining.push(snap);
      continue;
    }

    const now = new Date().toISOString();

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
        results.push({
          snapId: snap.id,
          status: "failed",
          fetchedAt: now,
          error: `HTTP ${response.status}`,
        });
        continue;
      }

      bucket.recordSuccess();
      const html = await response.text();
      const result = await parseProductPage(html);

      if (!result) {
        results.push({
          snapId: snap.id,
          status: "skipped",
          fetchedAt: now,
          error: "No parseable product data",
        });
        continue;
      }

      const { strategy, product } = result;
      const capturedAt = waybackTimestampToISO(snap.timestamp);
      const handle = extractProductHandle(snap.url);

      results.push({
        snapId: snap.id,
        status: "fetched",
        fetchedAt: now,
        data: {
          storeDomain: domain,
          handle,
          capturedAt,
          title: product.title,
          vendor: product.vendor,
          productType: product.productType,
          extractionStrategy: strategy,
          variantsJson: JSON.stringify(product.variants),
          imagesJson: JSON.stringify(product.images),
          videosJson: JSON.stringify(product.videos),
          rawPrice: product.rawPrice,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        snapId: snap.id,
        status: "failed",
        fetchedAt: new Date().toISOString(),
        error: message.slice(0, 500),
      });
    }
  }

  // 2. Map results → write operations (pure)
  const ops = archiveFetchResultsToWriteOps(results, jobId);

  // 3. Materialize → Drizzle queries
  const writes = materializeArchiveWrites(db, ops);

  // 4. Execute all writes in batched calls (IO)
  await batchExecute(db, writes);

  // 5. Re-enqueue remaining snapshots if any (IO)
  if (remaining.length > 0) {
    await queue.send({
      type: "archive_batch",
      domain,
      jobId,
      snapshots: remaining,
    });
    log.info("archive batch re-enqueued", { domain, jobId, remaining: remaining.length });
  }

  // 6. Check if job is complete (IO)
  const job = await db.query.archiveImportJobs.findFirst({
    where: { id: jobId },
  });
  if (job && remaining.length === 0) {
    const totalProcessed = job.fetchedSnapshots + job.failedSnapshots;
    if (totalProcessed >= job.totalSnapshots) {
      await db
        .update(archiveImportJobs)
        .set({ status: "completed", completedAt: new Date().toISOString() })
        .where(eq(archiveImportJobs.id, jobId));
      log.info("archive import completed", { domain, jobId, total: job.totalSnapshots });
    }
  }

  log.info("archive batch processed", {
    domain,
    jobId,
    fetched: results.filter(r => r.status !== "failed").length,
    failed: results.filter(r => r.status === "failed").length,
    remaining: remaining.length,
  });
}
