import { eq } from "drizzle-orm";
import type { Database } from "@webify/db";
import { getStaleProducts, queueJobs } from "@webify/db";
import { createLogger } from "@webify/db";
import type { ScrapeJobMessage } from "../types";

const log = createLogger("scrape-stale");

// Re-scrape every 24 hours
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function handleScrapeStale(
  db: Database,
  domain: string,
  queue: Queue<ScrapeJobMessage>,
  parentJobId?: string,
): Promise<void> {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(queueJobs).values({
    id: jobId,
    parentId: parentJobId ?? null,
    queue: "scrape",
    jobType: "scrape_stale",
    storeDomain: domain,
    status: "running",
    createdAt: now,
    startedAt: now,
  });

  const staleProducts = await getStaleProducts(db, domain, STALE_THRESHOLD_MS);

  for (const product of staleProducts) {
    await queue.send({
      type: "scrape_product",
      domain,
      productId: product.id,
      handle: product.handle,
    });
  }

  await db.update(queueJobs).set({
    status: "completed",
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - new Date(now).getTime(),
    itemsEnqueued: staleProducts.length,
    resultSummary: `${staleProducts.length} stale products`,
  }).where(eq(queueJobs.id, jobId));

  log.info("scrape_stale fan-out", { domain, enqueued: staleProducts.length });
}
