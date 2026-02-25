// Pure write-mapping + materialization for sync handler

import { eq } from "drizzle-orm";
import type { Database } from "@webify/db";
import {
  stores,
  products,
  productImages,
  variants,
  variantSnapshots,
  changeEvents,
} from "@webify/db";
import type { ChangeType, ChangeMagnitude } from "@webify/db";
import type { WriteOp } from "@webify/db/batch";
import { chunkByParams } from "@webify/db/batch";
import type { SyncDiff } from "@webify/core/diff";

// ---------------------------------------------------------------------------
// Layer 1: Pure data mapping (no db, no Drizzle imports at runtime)
// ---------------------------------------------------------------------------

export interface NewProductData {
  product: {
    id: number;
    storeDomain: string;
    handle: string;
    title: string;
    vendor: string | null;
    productType: string | null;
    firstSeenAt: string;
    isRemoved: false;
    shopifyCreatedAt: string | null;
    shopifyPublishedAt: string | null;
    shopifyUpdatedAt: string | null;
    cachedPrice: string;
    cachedIsAvailable: boolean;
    cachedImageUrl: string | null;
    titleSearchKey: string;
  };
  variants: {
    id: number;
    productId: number;
    title: string;
    sku: string | null;
    price: string;
    compareAtPrice: string | null;
    available: boolean;
    position: number;
  }[];
  images: {
    productId: number;
    url: string;
    position: number;
    firstSeenAt: string;
    lastSeenAt: string;
    isRemoved: false;
  }[];
}

export interface ProductUpdateData {
  id: number;
  values: {
    handle: string;
    title: string;
    vendor: string | null;
    productType: string | null;
    shopifyUpdatedAt: string | null;
    cachedPrice: string;
    cachedIsAvailable: boolean;
    cachedImageUrl: string | null;
    titleSearchKey: string;
  };
}

export interface VariantUpsertData {
  type: "insert" | "update";
  id: number;
  productId: number;
  values: {
    title: string;
    sku: string | null;
    price: string;
    compareAtPrice: string | null;
    available: boolean;
    position: number;
  };
}

export interface ImageUpsertData {
  type: "insert" | "update";
  id?: number;
  productId: number;
  values: {
    url: string;
    position: number;
    lastSeenAt: string;
    firstSeenAt?: string;
    isRemoved: false;
    removedAt?: null;
  };
}

export interface ImageSoftDeleteData {
  id: number;
  removedAt: string;
}

export interface SnapshotData {
  variantId: number;
  capturedAt: string;
  price: string;
  compareAtPrice: string | null;
  available: boolean;
}

export interface ChangeEventRow {
  id: string;
  storeDomain: string;
  occurredAt: string;
  changeType: ChangeType;
  magnitude: ChangeMagnitude;
  productTitle: string;
  variantTitle: string | null;
  oldValue: string | null;
  newValue: string | null;
  priceChange: string | null;
  isRead: false;
  productShopifyId: number | null;
}

export interface StoreUpdateData {
  domain: string;
  lastFetchedAt: string;
  syncStatus: "healthy";
  lastError: null;
  cachedProductCount: number;
}

export interface SyncWriteOps {
  newProducts: NewProductData[];
  restoreIds: number[];
  removeIds: number[];
  snapshots: SnapshotData[];
  productUpdates: ProductUpdateData[];
  variantUpserts: VariantUpsertData[];
  variantDeletes: number[];
  imageUpserts: ImageUpsertData[];
  imageSoftDeletes: ImageSoftDeleteData[];
  changeEvents: ChangeEventRow[];
  storeUpdate: StoreUpdateData;
}

interface ExistingVariantInfo {
  id: number;
  title: string;
  price: string;
  compareAtPrice: string | null;
  available: boolean;
  sku: string | null;
  position: number;
}

interface ExistingImageInfo {
  id: number;
  url: string;
  isRemoved: boolean;
}

export interface ExistingProductInfo {
  id: number;
  variants: ExistingVariantInfo[];
  images: ExistingImageInfo[];
}

export function syncDiffToWriteOps(
  diff: SyncDiff,
  existingProducts: Map<number, ExistingProductInfo>,
  domain: string,
  now: string,
): SyncWriteOps {
  const newProducts: NewProductData[] = [];
  const restoreIds: number[] = diff.restoredProductIds;
  const removeIds: number[] = diff.removedProductIds.map(r => r.id);
  const snapshots: SnapshotData[] = [];
  const productUpdates: ProductUpdateData[] = [];
  const variantUpserts: VariantUpsertData[] = [];
  const variantDeletes: number[] = [];
  const imageUpserts: ImageUpsertData[] = [];
  const imageSoftDeletes: ImageSoftDeleteData[] = [];
  const changeEventRows: ChangeEventRow[] = [];

  // New products
  for (const shopify of diff.newProducts) {
    const firstVariant = shopify.variants[0];
    const cachedPrice = firstVariant?.price ?? "0";
    const cachedIsAvailable = shopify.variants.some(v => v.available);

    newProducts.push({
      product: {
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
        cachedImageUrl: shopify.images[0]?.src ?? null,
        titleSearchKey: shopify.title.toLowerCase(),
      },
      variants: shopify.variants.map(v => ({
        id: v.id,
        productId: shopify.id,
        title: v.title,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        available: v.available,
        position: v.position,
      })),
      images: shopify.images.map((img, i) => ({
        productId: shopify.id,
        url: img.src,
        position: i,
        firstSeenAt: now,
        lastSeenAt: now,
        isRemoved: false as const,
      })),
    });
  }

  // Variant snapshots from changes
  for (const vc of diff.variantChanges) {
    if (vc.needsSnapshot) {
      snapshots.push({
        variantId: vc.variantId,
        capturedAt: now,
        price: vc.existingPrice,
        compareAtPrice: vc.existingCompareAtPrice,
        available: vc.existingAvailable,
      });
    }
  }

  // Updated products: product updates + variant upserts/deletes + image upserts/soft-deletes
  for (const up of diff.updatedProducts) {
    const shopify = up.shopify;
    const cachedPrice = shopify.variants[0]?.price ?? "0";
    const cachedIsAvailable = shopify.variants.some(v => v.available);

    productUpdates.push({
      id: up.productId,
      values: {
        handle: shopify.handle,
        title: shopify.title,
        vendor: shopify.vendor,
        productType: shopify.product_type,
        shopifyUpdatedAt: shopify.updated_at,
        cachedPrice,
        cachedIsAvailable,
        cachedImageUrl: shopify.images[0]?.src ?? null,
        titleSearchKey: shopify.title.toLowerCase(),
      },
    });

    const existing = existingProducts.get(up.productId);
    if (!existing) continue;

    // Variant upserts
    const existingVariantIds = new Set(existing.variants.map(v => v.id));
    const fetchedVariantIds = new Set(shopify.variants.map(v => v.id));

    for (const v of shopify.variants) {
      variantUpserts.push({
        type: existingVariantIds.has(v.id) ? "update" : "insert",
        id: v.id,
        productId: up.productId,
        values: {
          title: v.title,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compare_at_price,
          available: v.available,
          position: v.position,
        },
      });
    }

    for (const ev of existing.variants) {
      if (!fetchedVariantIds.has(ev.id)) {
        variantDeletes.push(ev.id);
      }
    }

    // Image upserts
    const existingUrlMap = new Map(existing.images.map(img => [img.url, img]));
    const fetchedUrls = new Set(shopify.images.map(img => img.src));

    for (let i = 0; i < shopify.images.length; i++) {
      const url = shopify.images[i].src;
      const existingImg = existingUrlMap.get(url);
      if (existingImg) {
        imageUpserts.push({
          type: "update",
          id: existingImg.id,
          productId: up.productId,
          values: {
            url,
            position: i,
            lastSeenAt: now,
            isRemoved: false,
            removedAt: null,
          },
        });
      } else {
        imageUpserts.push({
          type: "insert",
          productId: up.productId,
          values: {
            url,
            position: i,
            firstSeenAt: now,
            lastSeenAt: now,
            isRemoved: false,
          },
        });
      }
    }

    // Soft-delete images no longer in Shopify feed
    for (const existingImg of existing.images) {
      if (!fetchedUrls.has(existingImg.url) && !existingImg.isRemoved) {
        imageSoftDeletes.push({ id: existingImg.id, removedAt: now });
      }
    }
  }

  // Change events
  for (const c of diff.changes) {
    changeEventRows.push({
      id: crypto.randomUUID(),
      storeDomain: domain,
      occurredAt: now,
      changeType: c.changeType,
      magnitude: c.magnitude ?? "medium",
      productTitle: c.productTitle,
      variantTitle: c.variantTitle ?? null,
      oldValue: c.oldValue ?? null,
      newValue: c.newValue ?? null,
      priceChange: c.priceChange ?? null,
      isRead: false,
      productShopifyId: c.productShopifyId ?? null,
    });
  }

  // Store update
  const storeUpdate: StoreUpdateData = {
    domain,
    lastFetchedAt: now,
    syncStatus: "healthy",
    lastError: null,
    cachedProductCount: diff.newProducts.length + diff.updatedProducts.length,
  };

  return {
    newProducts,
    restoreIds,
    removeIds,
    snapshots,
    productUpdates,
    variantUpserts,
    variantDeletes,
    imageUpserts,
    imageSoftDeletes,
    changeEvents: changeEventRows,
    storeUpdate,
  };
}

// ---------------------------------------------------------------------------
// Layer 2: Materialize (thin, needs db)
// ---------------------------------------------------------------------------

export function materializeSyncWrites(db: Database, ops: SyncWriteOps): WriteOp[] {
  const writes: WriteOp[] = [];

  // New products
  for (const np of ops.newProducts) {
    writes.push(db.insert(products).values(np.product));

    for (const chunk of chunkByParams(np.variants, 8)) {
      writes.push(db.insert(variants).values(chunk));
    }

    for (const chunk of chunkByParams(np.images, 6)) {
      writes.push(db.insert(productImages).values(chunk));
    }
  }

  // Restore products
  for (const id of ops.restoreIds) {
    writes.push(
      db.update(products).set({ isRemoved: false }).where(eq(products.id, id)),
    );
  }

  // Remove products
  for (const id of ops.removeIds) {
    writes.push(
      db.update(products).set({ isRemoved: true }).where(eq(products.id, id)),
    );
  }

  // Variant snapshots
  for (const chunk of chunkByParams(ops.snapshots, 5)) {
    writes.push(db.insert(variantSnapshots).values(chunk));
  }

  // Product updates
  for (const pu of ops.productUpdates) {
    writes.push(
      db.update(products).set(pu.values).where(eq(products.id, pu.id)),
    );
  }

  // Variant upserts
  for (const vu of ops.variantUpserts) {
    if (vu.type === "update") {
      writes.push(
        db.update(variants).set(vu.values).where(eq(variants.id, vu.id)),
      );
    } else {
      writes.push(
        db.insert(variants).values({
          id: vu.id,
          productId: vu.productId,
          ...vu.values,
        }),
      );
    }
  }

  // Variant deletes
  for (const id of ops.variantDeletes) {
    writes.push(db.delete(variants).where(eq(variants.id, id)));
  }

  // Image upserts
  for (const iu of ops.imageUpserts) {
    if (iu.type === "update") {
      writes.push(
        db
          .update(productImages)
          .set({
            lastSeenAt: iu.values.lastSeenAt,
            position: iu.values.position,
            isRemoved: false,
            removedAt: null,
          })
          .where(eq(productImages.id, iu.id!)),
      );
    } else {
      writes.push(
        db.insert(productImages).values({
          productId: iu.productId,
          url: iu.values.url,
          position: iu.values.position,
          firstSeenAt: iu.values.firstSeenAt!,
          lastSeenAt: iu.values.lastSeenAt,
          isRemoved: false,
        }),
      );
    }
  }

  // Image soft-deletes
  for (const isd of ops.imageSoftDeletes) {
    writes.push(
      db
        .update(productImages)
        .set({ isRemoved: true, removedAt: isd.removedAt })
        .where(eq(productImages.id, isd.id)),
    );
  }

  // Change events
  for (const chunk of chunkByParams(ops.changeEvents, 13)) {
    writes.push(db.insert(changeEvents).values(chunk));
  }

  // Store update
  writes.push(
    db
      .update(stores)
      .set({
        lastFetchedAt: ops.storeUpdate.lastFetchedAt,
        syncStatus: ops.storeUpdate.syncStatus,
        lastError: ops.storeUpdate.lastError,
        cachedProductCount: ops.storeUpdate.cachedProductCount,
      })
      .where(eq(stores.domain, ops.storeUpdate.domain)),
  );

  return writes;
}
