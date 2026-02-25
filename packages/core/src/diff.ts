// Change detection — ported from watchify/Services/StoreService+Sync.swift

import {
  ChangeType,
  ChangeMagnitude,
  type NewChangeEvent,
  type Variant,
  type Product,
  type ProductImage,
} from "@webify/db";
import type { ShopifyProduct, ShopifyVariant } from "./shopify";

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
