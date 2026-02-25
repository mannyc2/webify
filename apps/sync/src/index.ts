// Sync worker entry point — scheduled (cron) + queue consumer

import { drizzle } from "drizzle-orm/d1";
import * as schema from "@webify/db";
import { createLogger } from "@webify/db";
import type { Env, SyncJobMessage, ScrapeJobMessage } from "./types";
import { syncStore } from "./sync";
import { handleScrapeStale } from "./scrape-stale";
import { handleScrapeProduct } from "./scrape-product";
import { handleArchiveDiscover } from "./archive-discover";
import { handleArchiveBatch } from "./archive-batch";

const log = createLogger("sync");

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const db = drizzle(env.DB, { schema, relations: schema.relations });
    const now = Date.now();

    // Query all stores, skip those not due for sync
    const allStores = await db.query.stores.findMany();

    let enqueued = 0;
    for (const store of allStores) {
      const lastFetched = store.lastFetchedAt
        ? new Date(store.lastFetchedAt).getTime()
        : 0;
      const nextSyncAt = lastFetched + store.syncFrequencySeconds * 1000;

      if (now >= nextSyncAt) {
        ctx.waitUntil(
          env.SYNC_QUEUE.send({
            domain: store.domain,
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
          const start = Date.now();
          const result = await syncStore(db, body.domain, env.SCRAPE_QUEUE);
          const durationMs = Date.now() - start;
          log.info("sync complete", {
            domain: body.domain,
            products: result.productCount,
            changes: result.changeCount,
            durationMs,
          });
          message.ack();
        } catch (error) {
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
              await handleScrapeStale(db, body.domain, env.SCRAPE_QUEUE);
              break;
            case "scrape_product":
              await handleScrapeProduct(db, body.domain, body.productId, body.handle);
              break;
            case "archive_discover":
              await handleArchiveDiscover(db, body.domain, body.jobId, env.SCRAPE_QUEUE);
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
