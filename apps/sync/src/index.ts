// Sync worker entry point — scheduled (cron) + queue consumer

import { drizzle } from "drizzle-orm/d1";
import * as schema from "@webify/db";
import type { Env, SyncJobMessage } from "./types";
import { syncStore } from "./sync";

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
      }
    }
  },

  async queue(
    batch: MessageBatch<SyncJobMessage>,
    env: Env,
  ): Promise<void> {
    const db = drizzle(env.DB, { schema, relations: schema.relations });

    for (const message of batch.messages) {
      try {
        await syncStore(db, message.body.domain);
        message.ack();
      } catch (error) {
        console.error(
          `Sync failed for store ${message.body.domain}:`,
          error,
        );
        message.retry();
      }
    }
  },
};
