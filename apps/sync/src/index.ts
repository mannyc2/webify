// Sync worker entry point — scheduled (cron) + queue consumer

import { drizzle } from "drizzle-orm/d1";
import * as schema from "@webify/db";
import { createLogger } from "@webify/db";
import type { Env, SyncJobMessage } from "./types";
import { syncStore } from "./sync";

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
    batch: MessageBatch<SyncJobMessage>,
    env: Env,
  ): Promise<void> {
    const db = drizzle(env.DB, { schema, relations: schema.relations });

    for (const message of batch.messages) {
      const domain = message.body.domain;
      try {
        const start = Date.now();
        const result = await syncStore(db, domain);
        const durationMs = Date.now() - start;
        log.info("sync complete", {
          domain,
          products: result.productCount,
          changes: result.changeCount,
          durationMs,
        });
        message.ack();
      } catch (error) {
        log.error("sync failed", {
          domain,
          error: error instanceof Error ? error.message : String(error),
          attempts: message.attempts,
        });
        message.retry();
      }
    }
  },
};
