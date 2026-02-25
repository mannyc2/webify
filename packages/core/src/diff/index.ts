// Change detection — ported from watchify/Services/StoreService+Sync.swift

import {
  ChangeType,
  ChangeMagnitude,
  type NewChangeEvent,
  type Variant,
  type Product,
  type ProductImage,
} from "@webify/db";
import type { ShopifyProduct, ShopifyVariant } from "../clients/shopify";

export type ChangeEventData = Pick<
  NewChangeEvent,
  | "changeType"
  | "magnitude"
  | "productTitle"
  | "variantTitle"
  | "oldValue"
  | "newValue"
  | "priceChange"
  | "productShopifyId"
>;

type ExistingVariant = Pick<
  Variant,
  "id" | "price" | "compareAtPrice" | "available" | "title"
>;

type ExistingProduct = Pick<Product, "id" | "title"> & {
  images: Pick<ProductImage, "url" | "id">[];
};

export function calculateMagnitude(
  oldPrice: string,
  newPrice: string,
): ChangeMagnitude {
  const old = parseFloat(oldPrice);
  const cur = parseFloat(newPrice);
  if (old === 0) return ChangeMagnitude.medium;
  const percentChange = (Math.abs(cur - old) / old) * 100;
  if (percentChange > 25) return ChangeMagnitude.large;
  if (percentChange > 10) return ChangeMagnitude.medium;
  return ChangeMagnitude.small;
}

export function detectPriceChanges(
  existing: ExistingVariant,
  fetched: ShopifyVariant,
  productTitle: string,
  productShopifyId: number,
): ChangeEventData | null {
  if (existing.price === fetched.price) return null;

  const oldNum = parseFloat(existing.price);
  const newNum = parseFloat(fetched.price);
  const priceDrop = newNum < oldNum;

  return {
    changeType: priceDrop
      ? ChangeType.priceDropped
      : ChangeType.priceIncreased,
    magnitude: calculateMagnitude(existing.price, fetched.price),
    productTitle,
    variantTitle: existing.title,
    oldValue: existing.price,
    newValue: fetched.price,
    priceChange: (newNum - oldNum).toFixed(2),
    productShopifyId,
  };
}

export function detectStockChanges(
  existing: ExistingVariant,
  fetched: ShopifyVariant,
  productTitle: string,
  productShopifyId: number,
): ChangeEventData | null {
  if (existing.available === fetched.available) return null;

  return {
    changeType: fetched.available
      ? ChangeType.backInStock
      : ChangeType.outOfStock,
    magnitude: ChangeMagnitude.medium,
    productTitle,
    variantTitle: existing.title,
    oldValue: existing.available ? "in_stock" : "out_of_stock",
    newValue: fetched.available ? "in_stock" : "out_of_stock",
    priceChange: null,
    productShopifyId,
  };
}

export function detectImageChanges(
  existing: ExistingProduct,
  fetched: ShopifyProduct,
): ChangeEventData | null {
  const existingUrls = existing.images.map((img) => img.url);
  const fetchedUrls = fetched.images.map((img) => img.src);

  const existingSet = new Set(existingUrls);
  const fetchedSet = new Set(fetchedUrls);

  const added = fetchedUrls.filter((url) => !existingSet.has(url));
  const removed = existingUrls.filter((url) => !fetchedSet.has(url));

  if (added.length === 0 && removed.length === 0) return null;

  return {
    changeType: ChangeType.imagesChanged,
    magnitude: ChangeMagnitude.medium,
    productTitle: existing.title,
    variantTitle: null,
    oldValue: removed.length > 0 ? removed.join(",") : null,
    newValue: added.length > 0 ? added.join(",") : null,
    priceChange: null,
    productShopifyId: existing.id,
  };
}

// --- computeSyncDiff types ---

export interface ExistingProductState {
  id: number;
  title: string;
  isRemoved: boolean;
  variants: { id: number; price: string; compareAtPrice: string | null; available: boolean; title: string }[];
  images: { id: number; url: string; isRemoved: boolean }[];
}

export interface VariantChangeResult {
  variantId: number;
  fetchedVariant: ShopifyVariant;
  existingPrice: string;
  existingCompareAtPrice: string | null;
  existingAvailable: boolean;
  priceChange: ChangeEventData | null;
  stockChange: ChangeEventData | null;
  needsSnapshot: boolean;
}

export interface SyncDiff {
  newProducts: ShopifyProduct[];
  removedProductIds: { id: number; title: string }[];
  restoredProductIds: number[];
  variantChanges: VariantChangeResult[];
  imageChanges: ChangeEventData[];
  updatedProducts: { productId: number; shopify: ShopifyProduct }[];
  changes: ChangeEventData[];
}

/**
 * Pure function: given existing DB state and fetched Shopify products,
 * compute the full diff without any IO.
 */
export function computeSyncDiff(
  existing: ExistingProductState[],
  fetched: ShopifyProduct[],
): SyncDiff {
  const existingById = new Map(existing.map(p => [p.id, p]));
  const fetchedIdSet = new Set(fetched.map(p => p.id));
  const changes: ChangeEventData[] = [];
  const newProducts: ShopifyProduct[] = [];
  const removedProductIds: { id: number; title: string }[] = [];
  const restoredProductIds: number[] = [];
  const variantChanges: VariantChangeResult[] = [];
  const imageChanges: ChangeEventData[] = [];
  const updatedProducts: { productId: number; shopify: ShopifyProduct }[] = [];

  for (const shopifyProduct of fetched) {
    const ex = existingById.get(shopifyProduct.id);

    if (!ex) {
      // New product
      newProducts.push(shopifyProduct);
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
      // Existing product
      if (ex.isRemoved) {
        restoredProductIds.push(ex.id);
      }

      updatedProducts.push({ productId: ex.id, shopify: shopifyProduct });

      const existingVariantsById = new Map(ex.variants.map(v => [v.id, v]));

      for (const fetchedVariant of shopifyProduct.variants) {
        const existingVariant = existingVariantsById.get(fetchedVariant.id);
        if (!existingVariant) continue;

        const priceChange = detectPriceChanges(
          existingVariant,
          fetchedVariant,
          ex.title,
          ex.id,
        );
        if (priceChange) changes.push(priceChange);

        const stockChange = detectStockChanges(
          existingVariant,
          fetchedVariant,
          ex.title,
          ex.id,
        );
        if (stockChange) changes.push(stockChange);

        const needsSnapshot =
          existingVariant.price !== fetchedVariant.price ||
          existingVariant.compareAtPrice !== fetchedVariant.compare_at_price ||
          existingVariant.available !== fetchedVariant.available;

        variantChanges.push({
          variantId: existingVariant.id,
          fetchedVariant,
          existingPrice: existingVariant.price,
          existingCompareAtPrice: existingVariant.compareAtPrice,
          existingAvailable: existingVariant.available,
          priceChange,
          stockChange,
          needsSnapshot,
        });
      }

      // Detect image changes
      const activeImages = ex.images.filter(img => !img.isRemoved);
      const imageChange = detectImageChanges(
        { id: ex.id, title: ex.title, images: activeImages },
        shopifyProduct,
      );
      if (imageChange) {
        imageChanges.push(imageChange);
        changes.push(imageChange);
      }
    }
  }

  // Mark products removed: active products not in fetched set
  for (const ex of existing) {
    if (!fetchedIdSet.has(ex.id) && !ex.isRemoved) {
      removedProductIds.push({ id: ex.id, title: ex.title });
      changes.push({
        changeType: ChangeType.productRemoved,
        magnitude: ChangeMagnitude.medium,
        productTitle: ex.title,
        variantTitle: null,
        oldValue: null,
        newValue: null,
        priceChange: null,
        productShopifyId: null,
      });
    }
  }

  return { newProducts, removedProductIds, restoredProductIds, variantChanges, imageChanges, updatedProducts, changes };
}
