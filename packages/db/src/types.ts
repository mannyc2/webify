// Shared enums matching Watchify's Swift ChangeType and ChangeMagnitude

import {
  stores,
  products,
  productImages,
  variants,
  variantSnapshots,
  changeEvents,
  productVideos,
  scrapeState,
  waybackSnapshots,
  waybackProductData,
  archiveImportJobs,
  queueJobs,
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

// ---------------------------------------------------------------------------
// New enums
// ---------------------------------------------------------------------------

export const VideoFormat = {
  mp4: "mp4",
  webm: "webm",
  m3u8: "m3u8",
  youtube: "youtube",
  vimeo: "vimeo",
  unknown: "unknown",
} as const;
export type VideoFormat = (typeof VideoFormat)[keyof typeof VideoFormat];

export const VideoSource = {
  liveScrape: "live_scrape",
  wayback: "wayback",
} as const;
export type VideoSource = (typeof VideoSource)[keyof typeof VideoSource];

export const ScrapeStatus = {
  pending: "pending",
  success: "success",
  failed: "failed",
  skipped: "skipped",
} as const;
export type ScrapeStatus = (typeof ScrapeStatus)[keyof typeof ScrapeStatus];

export const FetchStatus = {
  pending: "pending",
  fetched: "fetched",
  failed: "failed",
  skipped: "skipped",
} as const;
export type FetchStatus = (typeof FetchStatus)[keyof typeof FetchStatus];

export const ImportStatus = {
  discovering: "discovering",
  fetching: "fetching",
  completed: "completed",
  failed: "failed",
} as const;
export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];

// ---------------------------------------------------------------------------
// New canonical types
// ---------------------------------------------------------------------------

export type ProductVideo = typeof productVideos.$inferSelect;
export type NewProductVideo = typeof productVideos.$inferInsert;
export type ScrapeState = typeof scrapeState.$inferSelect;
export type WaybackSnapshotRow = typeof waybackSnapshots.$inferSelect;
export type NewWaybackSnapshot = typeof waybackSnapshots.$inferInsert;
export type WaybackProductDataRow = typeof waybackProductData.$inferSelect;
export type ArchiveImportJob = typeof archiveImportJobs.$inferSelect;
export type NewArchiveImportJob = typeof archiveImportJobs.$inferInsert;
export type QueueJob = typeof queueJobs.$inferSelect;
