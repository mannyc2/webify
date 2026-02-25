// Per-store sync orchestration — thin IO shell

import { eq } from "drizzle-orm";
import type { Database } from "@webify/db";
import { stores, SyncStatus } from "@webify/db";
import { fetchProducts } from "@webify/core/clients/shopify";
import { computeSyncDiff, type ExistingProductState } from "@webify/core/diff";
import { batchExecute } from "@webify/db/batch";
import { syncDiffToWriteOps, materializeSyncWrites, type ExistingProductInfo } from "./writes";

export interface SyncResult {
  productCount: number;
  changeCount: number;
}

export async function syncStore(
  db: Database,
  domain: string,
  scrapeQueue?: Queue,
  queueJobId?: string,
): Promise<SyncResult> {
  try {
    // 1. Fetch products from Shopify API (IO)
    const shopifyProducts = await fetchProducts(domain);

    // 2. Load existing state from DB (IO)
    const existingProducts = await db.query.products.findMany({
      where: { storeDomain: domain, isRemoved: false },
      with: { variants: true, images: true },
    });

    const removedProducts = await db.query.products.findMany({
      where: { storeDomain: domain, isRemoved: true },
      with: { variants: true, images: true },
    });

    const allExisting = [...existingProducts, ...removedProducts];

    // 3. Compute diff (pure — @webify/core)
    const existingState: ExistingProductState[] = allExisting.map(p => ({
      id: p.id,
      title: p.title,
      isRemoved: p.isRemoved,
      variants: p.variants.map(v => ({
        id: v.id,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        available: v.available,
        title: v.title,
      })),
      images: p.images.map(img => ({
        id: img.id,
        url: img.url,
        isRemoved: img.isRemoved,
      })),
    }));

    const diff = computeSyncDiff(existingState, shopifyProducts);

    // 4. Map diff → write operations (pure — returns plain data)
    const existingProductMap = new Map<number, ExistingProductInfo>();
    for (const p of allExisting) {
      existingProductMap.set(p.id, {
        id: p.id,
        variants: p.variants,
        images: p.images,
      });
    }

    const now = new Date().toISOString();
    const ops = syncDiffToWriteOps(diff, existingProductMap, domain, now);

    // Fix storeUpdate count: use total fetched from Shopify, not just new+updated
    ops.storeUpdate.cachedProductCount = shopifyProducts.length;

    // 5. Materialize data → Drizzle queries (data → WriteOp[])
    const writes = materializeSyncWrites(db, ops);

    // 6. Execute all writes in chunked db.batch() calls (IO)
    await batchExecute(db, writes);

    // 7. Enqueue scrape_stale check (IO)
    if (scrapeQueue) {
      await scrapeQueue.send({ type: "scrape_stale", domain, parentJobId: queueJobId });
    }

    return { productCount: shopifyProducts.length, changeCount: diff.changes.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await db
      .update(stores)
      .set({
        syncStatus: SyncStatus.failing,
        lastError: message.slice(0, 500),
      })
      .where(eq(stores.domain, domain));
    throw error;
  }
}
