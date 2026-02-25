import { z } from "zod"

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const storeSchema = z.object({
  domain: z.string(),
  name: z.string(),
  addedAt: z.string(),
  lastFetchedAt: z.string().nullable(),
  syncStatus: z.enum(["pending", "healthy", "failing", "stale"]),
  lastError: z.string().nullable(),
  syncFrequencySeconds: z.number(),
  cachedProductCount: z.number(),
  cachedPreviewImageUrls: z.string(),
  userId: z.string().nullable(),
})

export const storesResponseSchema = z.object({
  data: z.array(storeSchema),
})

export const storeResponseSchema = storeSchema

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

const productSchema = z.object({
  id: z.number(),
  storeDomain: z.string(),
  handle: z.string(),
  title: z.string(),
  vendor: z.string().nullable(),
  productType: z.string().nullable(),
  firstSeenAt: z.string(),
  isRemoved: z.boolean(),
  shopifyCreatedAt: z.string().nullable(),
  shopifyPublishedAt: z.string().nullable(),
  shopifyUpdatedAt: z.string().nullable(),
  cachedPrice: z.string(),
  cachedIsAvailable: z.boolean(),
  cachedImageUrl: z.string().nullable(),
  titleSearchKey: z.string(),
})

const imageSchema = z.object({
  id: z.number(),
  productId: z.number(),
  url: z.string(),
  position: z.number(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  isRemoved: z.boolean(),
  removedAt: z.string().nullable(),
})

const variantSchema = z.object({
  id: z.number(),
  productId: z.number(),
  title: z.string(),
  sku: z.string().nullable(),
  price: z.string(),
  compareAtPrice: z.string().nullable(),
  available: z.boolean(),
  position: z.number(),
})

export const productsResponseSchema = z.object({
  data: z.array(productSchema),
})

export const productTypesResponseSchema = z.object({
  data: z.array(z.string()),
})

export const productDetailSchema = productSchema.extend({
  variants: z.array(variantSchema),
  images: z.array(imageSchema),
})

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const changeEventSchema = z.object({
  id: z.string(),
  storeDomain: z.string(),
  occurredAt: z.string(),
  changeType: z.enum([
    "priceDropped",
    "priceIncreased",
    "backInStock",
    "outOfStock",
    "newProduct",
    "productRemoved",
    "imagesChanged",
  ]),
  magnitude: z.enum(["small", "medium", "large"]),
  productTitle: z.string(),
  variantTitle: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  priceChange: z.string().nullable(),
  isRead: z.boolean(),
  productShopifyId: z.number().nullable(),
  userId: z.string().nullable(),
})

export const eventsResponseSchema = z.object({
  data: z.array(changeEventSchema),
})

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

const snapshotSchema = z.object({
  id: z.number(),
  variantId: z.number(),
  capturedAt: z.string(),
  price: z.string(),
  compareAtPrice: z.string().nullable(),
  available: z.boolean(),
})

export const snapshotsResponseSchema = z.object({
  data: z.array(snapshotSchema),
})

// ---------------------------------------------------------------------------
// Mutation responses
// ---------------------------------------------------------------------------

export const successResponseSchema = z.object({
  success: z.boolean(),
})

// ---------------------------------------------------------------------------
// Archived images
// ---------------------------------------------------------------------------

const archivedImageSchema = z.object({
  url: z.string(),
  firstSeen: z.string(),
  lastSeen: z.string(),
})

export const archivedImagesResponseSchema = z.object({
  data: z.array(archivedImageSchema),
})

// ---------------------------------------------------------------------------
// Archived products
// ---------------------------------------------------------------------------

const archivedProductSchema = z.object({
  handle: z.string(),
  title: z.string(),
  vendor: z.string().nullable(),
  productType: z.string().nullable(),
  rawPrice: z.string().nullable(),
  capturedAt: z.string(),
  thumbnail: z.string().nullable(),
  snapshotCount: z.number(),
})

export const archivedProductsResponseSchema = z.object({
  data: z.array(archivedProductSchema),
  total: z.number(),
})

const timelineEntrySchema = z.object({
  id: z.number(),
  capturedAt: z.string(),
  title: z.string().nullable(),
  rawPrice: z.string().nullable(),
  extractionStrategy: z.string().nullable(),
})

export const archivedProductDetailSchema = z.object({
  handle: z.string(),
  title: z.string(),
  vendor: z.string().nullable(),
  productType: z.string().nullable(),
  rawPrice: z.string().nullable(),
  capturedAt: z.string(),
  images: z.array(z.string()),
  variants: z.array(z.record(z.unknown())),
  timeline: z.array(timelineEntrySchema),
})

// ---------------------------------------------------------------------------
// Queue Status (admin)
// ---------------------------------------------------------------------------

const queueJobSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  queue: z.enum(["sync", "scrape"]),
  jobType: z.enum(["sync_store", "scrape_stale", "archive_discover"]),
  storeDomain: z.string(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  attempt: z.number(),
  itemsEnqueued: z.number().nullable(),
  resultSummary: z.string().nullable(),
  error: z.string().nullable(),
})

export const queueStatusResponseSchema = z.object({
  generatedAt: z.string(),
  jobs: z.object({
    active: z.array(queueJobSchema),
    recent: z.array(queueJobSchema),
  }),
  sync: z.object({
    counts: z.object({
      total: z.number(),
      pending: z.number(),
      healthy: z.number(),
      failing: z.number(),
      stale: z.number(),
    }),
    overdue: z.array(z.object({
      domain: z.string(),
      name: z.string(),
      syncStatus: z.string(),
      lastFetchedAt: z.string().nullable(),
      syncFrequencySeconds: z.number(),
      overdueSeconds: z.number(),
    })),
    failing: z.array(z.object({
      domain: z.string(),
      name: z.string(),
      lastFetchedAt: z.string().nullable(),
      lastError: z.string().nullable(),
    })),
  }),
  scrape: z.object({
    counts: z.object({
      total: z.number(),
      pending: z.number(),
      success: z.number(),
      failed: z.number(),
      skipped: z.number(),
    }),
    recentFailures: z.array(z.object({
      productId: z.number(),
      productTitle: z.string(),
      storeDomain: z.string(),
      scrapeStatus: z.string(),
      lastScrapedAt: z.string().nullable(),
      lastError: z.string().nullable(),
    })),
  }),
  activity: z.object({
    lastHour: z.number(),
    lastDay: z.number(),
    byType: z.array(z.object({ changeType: z.string(), count: z.number() })),
  }),
})
