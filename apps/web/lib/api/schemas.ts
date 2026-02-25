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
