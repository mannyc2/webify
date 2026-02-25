// Sync worker entry point — scheduled (cron) + queue consumer

import { drizzle } from "drizzle-orm/d1";
import { eq, lt, inArray, and } from "drizzle-orm";
import * as schema from "@webify/db";
import { queueJobs, createLogger } from "@webify/db";
import type { Env, SyncJobMessage, ScrapeJobMessage } from "./types";
import { syncStore } from "./sync/handler";
import { handleScrapeStale } from "./scrape/stale";
import { handleScrapeProduct } from "./scrape/product";
import { handleArchiveDiscover } from "./archive/discover";
import { handleArchiveBatch } from "./archive/batch";

const log = createLogger("sync");

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const db = drizzle(env.DB, { schema, relations: schema.relations });
    const now = Date.now();

    // Cleanup completed/failed jobs older than 48h
    const cutoff = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    await db.delete(queueJobs).where(
      and(
        inArray(queueJobs.status, ["completed", "failed"]),
        lt(queueJobs.completedAt, cutoff),
      ),
    );

    // Query all stores, skip those not due for sync
    const allStores = await db.query.stores.findMany();

    let enqueued = 0;
    for (const store of allStores) {
      const lastFetched = store.lastFetchedAt
        ? new Date(store.lastFetchedAt).getTime()
        : 0;
      const nextSyncAt = lastFetched + store.syncFrequencySeconds * 1000;

      if (now >= nextSyncAt) {
        const jobId = crypto.randomUUID();
        await db.insert(queueJobs).values({
          id: jobId,
          queue: "sync",
          jobType: "sync_store",
          storeDomain: store.domain,
          status: "queued",
          createdAt: new Date().toISOString(),
        });
        ctx.waitUntil(
          env.SYNC_QUEUE.send({
            domain: store.domain,
            queueJobId: jobId,
          } satisfies SyncJobMessage),
        );
        enqueued++;
      }
    }

    log.info("cron complete", { totalStores: allStores.length, enqueued });
  },

  async queue(
    batch: MessageBatch<SyncJobMessage | ScrapeJobMessage>,
    env: Env,
  ): Promise<void> {
    const db = drizzle(env.DB, { schema, relations: schema.relations });

    if (batch.queue === "webify-sync-jobs") {
      for (const message of batch.messages) {
        const body = message.body as SyncJobMessage;
        try {
          if (body.queueJobId) {
            await db.update(queueJobs).set({
              status: "running",
              startedAt: new Date().toISOString(),
              attempt: message.attempts,
            }).where(eq(queueJobs.id, body.queueJobId));
          }
          const start = Date.now();
          const result = await syncStore(db, body.domain, env.SCRAPE_QUEUE, body.queueJobId);
          const durationMs = Date.now() - start;
          if (body.queueJobId) {
            await db.update(queueJobs).set({
              status: "completed",
              completedAt: new Date().toISOString(),
              durationMs,
              resultSummary: `${result.productCount} products, ${result.changeCount} changes`,
            }).where(eq(queueJobs.id, body.queueJobId));
          }
          log.info("sync complete", {
            domain: body.domain,
            products: result.productCount,
            changes: result.changeCount,
            durationMs,
          });
          message.ack();
        } catch (error) {
          if (body.queueJobId) {
            await db.update(queueJobs).set({
              status: "failed",
              completedAt: new Date().toISOString(),
              error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
            }).where(eq(queueJobs.id, body.queueJobId));
          }
          log.error("sync failed", {
            domain: body.domain,
            error: error instanceof Error ? error.message : String(error),
            attempts: message.attempts,
          });
          message.retry();
        }
      }
    } else if (batch.queue === "webify-scrape-jobs") {
      for (const message of batch.messages) {
        const body = message.body as ScrapeJobMessage;
        try {
          switch (body.type) {
            case "scrape_stale":
              await handleScrapeStale(db, body.domain, env.SCRAPE_QUEUE, body.parentJobId);
              break;
            case "scrape_product":
              await handleScrapeProduct(db, body.domain, body.productId, body.handle);
              break;
            case "archive_discover":
              await handleArchiveDiscover(db, body.domain, body.jobId, env.SCRAPE_QUEUE, body.queueJobId);
              break;
            case "archive_batch":
              await handleArchiveBatch(db, body.domain, body.jobId, body.snapshots, env.SCRAPE_QUEUE);
              break;
          }
          message.ack();
        } catch (error) {
          log.error("scrape job failed", {
            type: body.type,
            error: error instanceof Error ? error.message : String(error),
            attempts: message.attempts,
          });
          message.retry();
        }
      }
    }
  },
};
