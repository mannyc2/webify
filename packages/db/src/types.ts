// Shared enums matching Watchify's Swift ChangeType and ChangeMagnitude

import {
  stores,
  products,
  productImages,
  variants,
  variantSnapshots,
  changeEvents,
} from "./schema";

export const ChangeType = {
  priceDropped: "priceDropped",
  priceIncreased: "priceIncreased",
  backInStock: "backInStock",
  outOfStock: "outOfStock",
  newProduct: "newProduct",
  productRemoved: "productRemoved",
  imagesChanged: "imagesChanged",
} as const;

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];

export const ChangeMagnitude = {
  small: "small", // < 10%
  medium: "medium", // 10-25%
  large: "large", // > 25%
} as const;

export type ChangeMagnitude =
  (typeof ChangeMagnitude)[keyof typeof ChangeMagnitude];

export const SyncStatus = {
  pending: "pending",
  healthy: "healthy",
  failing: "failing",
  stale: "stale",
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

// Canonical table types — use these instead of InferSelectModel
export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type VariantSnapshot = typeof variantSnapshots.$inferSelect;
export type ChangeEvent = typeof changeEvents.$inferSelect;
export type NewChangeEvent = typeof changeEvents.$inferInsert;
