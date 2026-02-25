// Per-store sync orchestration — ported from watchify/Services/StoreService+Sync.swift

import { eq } from "drizzle-orm";
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
import {
  fetchProducts,
  type ShopifyProduct,
  detectPriceChanges,
  detectStockChanges,
  detectImageChanges,
  type ChangeEventData,
} from "@webify/core";

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

    for (const shopifyProduct of shopifyProducts) {
      const existing = existingById.get(shopifyProduct.id);

      if (!existing) {
        // New product — insert product + variants + images
        await insertNewProduct(db, domain, shopifyProduct, now);
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
        // Existing product — detect changes, then update
        if (existing.isRemoved) {
          await db
            .update(products)
            .set({ isRemoved: false })
            .where(eq(products.id, existing.id));
        }

        const existingVariantsById = new Map(
          existing.variants.map((v) => [v.id, v]),
        );

        // Detect variant-level changes
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

          // Create snapshot if price or availability changed
          if (
            existingVariant.price !== fetchedVariant.price ||
            existingVariant.compareAtPrice !== fetchedVariant.compare_at_price ||
            existingVariant.available !== fetchedVariant.available
          ) {
            await db.insert(variantSnapshots).values({
              variantId: existingVariant.id,
              capturedAt: now,
              price: existingVariant.price,
              compareAtPrice: existingVariant.compareAtPrice,
              available: existingVariant.available,
            });
          }
        }

        // Detect image changes
        const activeImages = existing.images.filter((img) => !img.isRemoved);
        const imageChange = detectImageChanges(
          {
            id: existing.id,
            title: existing.title,
            images: activeImages,
          },
          shopifyProduct,
        );
        if (imageChange) changes.push(imageChange);

        // Update product fields + images
        await updateExistingProduct(db, existing.id, shopifyProduct, now);
      }
    }

    // Mark products removed: active products not in fetched set
    for (const existing of existingProducts) {
      if (!fetchedIdSet.has(existing.id) && !existing.isRemoved) {
        await db
          .update(products)
          .set({ isRemoved: true })
          .where(eq(products.id, existing.id));

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

    // Batch insert change events
    if (changes.length > 0) {
      await db.insert(changeEvents).values(
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
      );
    }

    // Update store metadata
    await db
      .update(stores)
      .set({
        lastFetchedAt: now,
        syncStatus: SyncStatus.healthy,
        lastError: null,
        cachedProductCount: shopifyProducts.length,
      })
      .where(eq(stores.domain, domain));

    return { productCount: shopifyProducts.length, changeCount: changes.length };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
    await db
      .update(stores)
      .set({
        syncStatus: SyncStatus.failing,
        lastError: message,
      })
      .where(eq(stores.domain, domain));
    throw error;
  }
}

async function insertNewProduct(
  db: Database,
  domain: string,
  shopify: ShopifyProduct,
  now: string,
): Promise<void> {
  const firstVariant = shopify.variants[0];
  const cachedPrice = firstVariant?.price ?? "0";
  const cachedIsAvailable = shopify.variants.some((v) => v.available);

  await db.insert(products).values({
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
  });

  // Batch insert variants
  if (shopify.variants.length > 0) {
    await db.insert(variants).values(
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
    );
  }

  // Batch insert images
  if (shopify.images.length > 0) {
    await db.insert(productImages).values(
      shopify.images.map((img, i) => ({
        productId: shopify.id,
        url: img.src,
        position: i,
        firstSeenAt: now,
        lastSeenAt: now,
        isRemoved: false,
      })),
    );
  }
}

async function updateExistingProduct(
  db: Database,
  productId: number,
  shopify: ShopifyProduct,
  now: string,
): Promise<void> {
  const cachedPrice = shopify.variants[0]?.price ?? "0";
  const cachedIsAvailable = shopify.variants.some((v) => v.available);

  await db
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
    .where(eq(products.id, productId));

  // --- Variants ---
  const existingVariants = await db.query.variants.findMany({
    where: { productId },
  });
  const existingVariantIds = new Set(existingVariants.map((v) => v.id));
  const fetchedVariantIds = new Set(shopify.variants.map((v) => v.id));

  for (const v of shopify.variants) {
    if (existingVariantIds.has(v.id)) {
      await db
        .update(variants)
        .set({
          title: v.title,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compare_at_price,
          available: v.available,
          position: v.position,
        })
        .where(eq(variants.id, v.id));
    } else {
      await db.insert(variants).values({
        id: v.id,
        productId,
        title: v.title,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        available: v.available,
        position: v.position,
      });
    }
  }

  // Delete variants no longer in Shopify feed
  for (const existing of existingVariants) {
    if (!fetchedVariantIds.has(existing.id)) {
      await db.delete(variants).where(eq(variants.id, existing.id));
    }
  }

  // --- Images (soft-delete model) ---
  const existingImages = await db.query.productImages.findMany({
    where: { productId },
  });
  const existingUrlMap = new Map(
    existingImages.map((img) => [img.url, img]),
  );
  const fetchedUrls = new Set(shopify.images.map((img) => img.src));

  // Upsert images from Shopify
  for (let i = 0; i < shopify.images.length; i++) {
    const url = shopify.images[i].src;
    const existing = existingUrlMap.get(url);
    if (existing) {
      // Update last seen + un-remove if needed
      await db
        .update(productImages)
        .set({
          lastSeenAt: now,
          position: i,
          isRemoved: false,
          removedAt: null,
        })
        .where(eq(productImages.id, existing.id));
    } else {
      await db.insert(productImages).values({
        productId,
        url,
        position: i,
        firstSeenAt: now,
        lastSeenAt: now,
        isRemoved: false,
      });
    }
  }

  // Soft-delete images no longer in Shopify feed
  for (const existing of existingImages) {
    if (!fetchedUrls.has(existing.url) && !existing.isRemoved) {
      await db
        .update(productImages)
        .set({ isRemoved: true, removedAt: now })
        .where(eq(productImages.id, existing.id));
    }
  }
}
