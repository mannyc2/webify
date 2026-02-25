// Per-store sync orchestration — ported from watchify/Services/StoreService+Sync.swift

import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "@webify/db";
import {
  stores,
  products,
  productImages,
  variants,
  variantSnapshots,
  changeEvents,
  SyncStatus,
  ChangeType,
  ChangeMagnitude,
} from "@webify/db";
import type { Variant, ProductImage } from "@webify/db";
import {
  fetchProducts,
  type ShopifyProduct,
  detectPriceChanges,
  detectStockChanges,
  detectImageChanges,
  type ChangeEventData,
} from "@webify/core";

// D1 limits bound parameters to 100 per statement.
const D1_MAX_PARAMS = 100;

// Max statements per db.batch() call.
const BATCH_CHUNK_SIZE = 100;

type WriteOp = BatchItem<"sqlite">;

/**
 * Collect chunked insert queries (respecting D1's 100-param-per-statement limit).
 * Pushes one INSERT statement per chunk into the writes array.
 */
function collectInsertChunks<T extends Record<string, unknown>>(
  writes: WriteOp[],
  db: Database,
  table: Parameters<Database["insert"]>[0],
  rows: T[],
  paramsPerRow: number,
): void {
  if (rows.length === 0) return;
  const chunkSize = Math.floor(D1_MAX_PARAMS / paramsPerRow);
  for (let i = 0; i < rows.length; i += chunkSize) {
    writes.push(db.insert(table).values(rows.slice(i, i + chunkSize)));
  }
}

/**
 * Execute an array of prepared queries in batched chunks.
 * Each chunk is sent as a single D1 subrequest via db.batch().
 */
async function batchExecute(db: Database, writes: WriteOp[]): Promise<void> {
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

export interface SyncResult {
  productCount: number;
  changeCount: number;
}

export async function syncStore(
  db: Database,
  domain: string,
): Promise<SyncResult> {
  try {
    const shopifyProducts = await fetchProducts(domain);

    const existingProducts = await db.query.products.findMany({
      where: { storeDomain: domain, isRemoved: false },
      with: { variants: true, images: true },
    });

    // Also fetch removed products that may re-appear
    const removedProducts = await db.query.products.findMany({
      where: { storeDomain: domain, isRemoved: true },
      with: { variants: true, images: true },
    });

    const allExisting = [...existingProducts, ...removedProducts];
    const existingById = new Map(allExisting.map((p) => [p.id, p]));
    const fetchedIdSet = new Set(shopifyProducts.map((p) => p.id));
    const changes: ChangeEventData[] = [];
    const now = new Date().toISOString();

    // Collect ALL write operations — executed as batched D1 calls at the end.
    // This reduces ~5,000+ individual subrequests to ~50 batched calls.
    const writes: WriteOp[] = [];

    for (const shopifyProduct of shopifyProducts) {
      const existing = existingById.get(shopifyProduct.id);

      if (!existing) {
        // New product — collect insert queries
        collectNewProductWrites(writes, db, domain, shopifyProduct, now);
        changes.push({
          changeType: ChangeType.newProduct,
          magnitude: ChangeMagnitude.medium,
          productTitle: shopifyProduct.title,
          variantTitle: null,
          oldValue: null,
          newValue: null,
          priceChange: null,
          productShopifyId: shopifyProduct.id,
        });
      } else {
        // Existing product — detect changes, collect update queries
        if (existing.isRemoved) {
          writes.push(
            db
              .update(products)
              .set({ isRemoved: false })
              .where(eq(products.id, existing.id)),
          );
        }

        const existingVariantsById = new Map(
          existing.variants.map((v) => [v.id, v]),
        );

        // Detect variant-level changes + collect snapshot inserts
        for (const fetchedVariant of shopifyProduct.variants) {
          const existingVariant = existingVariantsById.get(fetchedVariant.id);
          if (!existingVariant) continue;

          const priceChange = detectPriceChanges(
            existingVariant,
            fetchedVariant,
            existing.title,
            existing.id,
          );
          if (priceChange) changes.push(priceChange);

          const stockChange = detectStockChanges(
            existingVariant,
            fetchedVariant,
            existing.title,
            existing.id,
          );
          if (stockChange) changes.push(stockChange);

          // Snapshot if price or availability changed
          if (
            existingVariant.price !== fetchedVariant.price ||
            existingVariant.compareAtPrice !== fetchedVariant.compare_at_price ||
            existingVariant.available !== fetchedVariant.available
          ) {
            writes.push(
              db.insert(variantSnapshots).values({
                variantId: existingVariant.id,
                capturedAt: now,
                price: existingVariant.price,
                compareAtPrice: existingVariant.compareAtPrice,
                available: existingVariant.available,
              }),
            );
          }
        }

        // Detect image changes
        const activeImages = existing.images.filter((img) => !img.isRemoved);
        const imageChange = detectImageChanges(
          { id: existing.id, title: existing.title, images: activeImages },
          shopifyProduct,
        );
        if (imageChange) changes.push(imageChange);

        // Collect product + variant + image update queries (no extra DB reads)
        collectUpdateWrites(
          writes,
          db,
          existing.id,
          existing.variants,
          existing.images,
          shopifyProduct,
          now,
        );
      }
    }

    // Mark products removed: active products not in fetched set
    for (const existing of existingProducts) {
      if (!fetchedIdSet.has(existing.id) && !existing.isRemoved) {
        writes.push(
          db
            .update(products)
            .set({ isRemoved: true })
            .where(eq(products.id, existing.id)),
        );

        changes.push({
          changeType: ChangeType.productRemoved,
          magnitude: ChangeMagnitude.medium,
          productTitle: existing.title,
          variantTitle: null,
          oldValue: null,
          newValue: null,
          priceChange: null,
          productShopifyId: null,
        });
      }
    }

    // Insert change events (13 bound params per row)
    if (changes.length > 0) {
      collectInsertChunks(
        writes,
        db,
        changeEvents,
        changes.map((c) => ({
          id: crypto.randomUUID(),
          storeDomain: domain,
          occurredAt: now,
          changeType: c.changeType,
          magnitude: c.magnitude,
          productTitle: c.productTitle,
          variantTitle: c.variantTitle,
          oldValue: c.oldValue,
          newValue: c.newValue,
          priceChange: c.priceChange,
          isRead: false,
          productShopifyId: c.productShopifyId,
        })),
        13,
      );
    }

    // Update store metadata
    writes.push(
      db
        .update(stores)
        .set({
          lastFetchedAt: now,
          syncStatus: SyncStatus.healthy,
          lastError: null,
          cachedProductCount: shopifyProducts.length,
        })
        .where(eq(stores.domain, domain)),
    );

    // Execute ALL writes in batched D1 calls
    await batchExecute(db, writes);

    return { productCount: shopifyProducts.length, changeCount: changes.length };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
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

/** Collect insert queries for a new product (product + variants + images). */
function collectNewProductWrites(
  writes: WriteOp[],
  db: Database,
  domain: string,
  shopify: ShopifyProduct,
  now: string,
): void {
  const firstVariant = shopify.variants[0];
  const cachedPrice = firstVariant?.price ?? "0";
  const cachedIsAvailable = shopify.variants.some((v) => v.available);

  writes.push(
    db.insert(products).values({
      id: shopify.id,
      storeDomain: domain,
      handle: shopify.handle,
      title: shopify.title,
      vendor: shopify.vendor,
      productType: shopify.product_type,
      firstSeenAt: now,
      isRemoved: false,
      shopifyCreatedAt: shopify.created_at,
      shopifyPublishedAt: shopify.published_at,
      shopifyUpdatedAt: shopify.updated_at,
      cachedPrice,
      cachedIsAvailable,
      titleSearchKey: shopify.title.toLowerCase(),
    }),
  );

  // Insert variants (8 bound params per row)
  if (shopify.variants.length > 0) {
    collectInsertChunks(
      writes,
      db,
      variants,
      shopify.variants.map((v) => ({
        id: v.id,
        productId: shopify.id,
        title: v.title,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        available: v.available,
        position: v.position,
      })),
      8,
    );
  }

  // Insert images (6 bound params per row)
  if (shopify.images.length > 0) {
    collectInsertChunks(
      writes,
      db,
      productImages,
      shopify.images.map((img, i) => ({
        productId: shopify.id,
        url: img.src,
        position: i,
        firstSeenAt: now,
        lastSeenAt: now,
        isRemoved: false,
      })),
      6,
    );
  }
}

/**
 * Collect update/insert/delete queries for an existing product.
 * Uses the already-loaded variants and images — no extra DB reads needed.
 */
function collectUpdateWrites(
  writes: WriteOp[],
  db: Database,
  productId: number,
  existingVariants: Variant[],
  existingImages: ProductImage[],
  shopify: ShopifyProduct,
  now: string,
): void {
  const cachedPrice = shopify.variants[0]?.price ?? "0";
  const cachedIsAvailable = shopify.variants.some((v) => v.available);

  // Update product fields
  writes.push(
    db
      .update(products)
      .set({
        handle: shopify.handle,
        title: shopify.title,
        vendor: shopify.vendor,
        productType: shopify.product_type,
        shopifyUpdatedAt: shopify.updated_at,
        cachedPrice,
        cachedIsAvailable,
        titleSearchKey: shopify.title.toLowerCase(),
      })
      .where(eq(products.id, productId)),
  );

  // --- Variants ---
  const existingVariantIds = new Set(existingVariants.map((v) => v.id));
  const fetchedVariantIds = new Set(shopify.variants.map((v) => v.id));

  for (const v of shopify.variants) {
    if (existingVariantIds.has(v.id)) {
      writes.push(
        db
          .update(variants)
          .set({
            title: v.title,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compare_at_price,
            available: v.available,
            position: v.position,
          })
          .where(eq(variants.id, v.id)),
      );
    } else {
      writes.push(
        db.insert(variants).values({
          id: v.id,
          productId,
          title: v.title,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compare_at_price,
          available: v.available,
          position: v.position,
        }),
      );
    }
  }

  // Delete variants no longer in Shopify feed
  for (const ev of existingVariants) {
    if (!fetchedVariantIds.has(ev.id)) {
      writes.push(db.delete(variants).where(eq(variants.id, ev.id)));
    }
  }

  // --- Images (soft-delete model) ---
  const existingUrlMap = new Map(existingImages.map((img) => [img.url, img]));
  const fetchedUrls = new Set(shopify.images.map((img) => img.src));

  for (let i = 0; i < shopify.images.length; i++) {
    const url = shopify.images[i].src;
    const existingImg = existingUrlMap.get(url);
    if (existingImg) {
      writes.push(
        db
          .update(productImages)
          .set({
            lastSeenAt: now,
            position: i,
            isRemoved: false,
            removedAt: null,
          })
          .where(eq(productImages.id, existingImg.id)),
      );
    } else {
      writes.push(
        db.insert(productImages).values({
          productId,
          url,
          position: i,
          firstSeenAt: now,
          lastSeenAt: now,
          isRemoved: false,
        }),
      );
    }
  }

  // Soft-delete images no longer in Shopify feed
  for (const existingImg of existingImages) {
    if (!fetchedUrls.has(existingImg.url) && !existingImg.isRemoved) {
      writes.push(
        db
          .update(productImages)
          .set({ isRemoved: true, removedAt: now })
          .where(eq(productImages.id, existingImg.id)),
      );
    }
  }
}
