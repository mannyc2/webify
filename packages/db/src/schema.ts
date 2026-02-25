import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { defineRelations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// stores — domain is the natural key
// ---------------------------------------------------------------------------

export const stores = sqliteTable(
  "stores",
  {
    domain: text("domain").primaryKey(), // e.g. "shop.example.com"
    name: text("name").notNull(),
    addedAt: text("added_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    lastFetchedAt: text("last_fetched_at"),
    syncStatus: text("sync_status", { enum: ["pending", "healthy", "failing", "stale"] as const }).notNull().default("pending"),
    lastError: text("last_error"),
    syncFrequencySeconds: integer("sync_frequency_seconds")
      .notNull()
      .default(900),
    cachedProductCount: integer("cached_product_count").notNull().default(0),
    cachedPreviewImageUrls: text("cached_preview_image_urls")
      .notNull()
      .default("[]"), // JSON array
    userId: text("user_id"), // nullable, future multi-tenancy
  },
  (table) => [index("idx_stores_sync_status").on(table.syncStatus)],
);

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey(), // Shopify product ID (Int64)
    storeDomain: text("store_domain")
      .notNull()
      .references(() => stores.domain, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    title: text("title").notNull(),
    vendor: text("vendor"),
    productType: text("product_type"),
    firstSeenAt: text("first_seen_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    isRemoved: integer("is_removed", { mode: "boolean" })
      .notNull()
      .default(false),
    shopifyCreatedAt: text("shopify_created_at"),
    shopifyPublishedAt: text("shopify_published_at"),
    shopifyUpdatedAt: text("shopify_updated_at"),
    cachedPrice: text("cached_price").notNull().default("0"), // Decimal as string
    cachedIsAvailable: integer("cached_is_available", { mode: "boolean" })
      .notNull()
      .default(false),
    cachedImageUrl: text("cached_image_url"),
    titleSearchKey: text("title_search_key").notNull().default(""),
  },
  (table) => [
    index("idx_products_store").on(table.storeDomain),
    index("idx_products_store_removed").on(table.storeDomain, table.isRemoved),
    index("idx_products_store_available").on(
      table.storeDomain,
      table.cachedIsAvailable,
    ),
    index("idx_products_store_price").on(table.storeDomain, table.cachedPrice),
    index("idx_products_store_search").on(
      table.storeDomain,
      table.titleSearchKey,
    ),
    index("idx_products_store_published").on(
      table.storeDomain,
      table.shopifyPublishedAt,
    ),
  ],
);

// ---------------------------------------------------------------------------
// product_images — first-class image URL tracking
// ---------------------------------------------------------------------------

export const productImages = sqliteTable(
  "product_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(), // Shopify CDN URL
    position: integer("position").notNull().default(0), // order in gallery
    firstSeenAt: text("first_seen_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    lastSeenAt: text("last_seen_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    isRemoved: integer("is_removed", { mode: "boolean" })
      .notNull()
      .default(false),
    removedAt: text("removed_at"),
  },
  (table) => [
    index("idx_images_product").on(table.productId),
    index("idx_images_product_active").on(table.productId, table.isRemoved),
    index("idx_images_first_seen").on(table.firstSeenAt),
    index("idx_images_url").on(table.url),
  ],
);

// ---------------------------------------------------------------------------
// variants
// ---------------------------------------------------------------------------

export const variants = sqliteTable(
  "variants",
  {
    id: integer("id").primaryKey(), // Shopify variant ID (Int64)
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sku: text("sku"),
    price: text("price").notNull().default("0"), // Decimal as string
    compareAtPrice: text("compare_at_price"),
    available: integer("available", { mode: "boolean" })
      .notNull()
      .default(false),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("idx_variants_product").on(table.productId)],
);

// ---------------------------------------------------------------------------
// variant_snapshots
// ---------------------------------------------------------------------------

export const variantSnapshots = sqliteTable(
  "variant_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    capturedAt: text("captured_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    price: text("price").notNull(), // Decimal as string
    compareAtPrice: text("compare_at_price"),
    available: integer("available", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    index("idx_snapshots_variant").on(table.variantId),
    index("idx_snapshots_captured").on(table.capturedAt),
  ],
);

// ---------------------------------------------------------------------------
// change_events
// ---------------------------------------------------------------------------

export const changeEvents = sqliteTable(
  "change_events",
  {
    id: text("id").primaryKey(), // UUID
    storeDomain: text("store_domain")
      .notNull()
      .references(() => stores.domain, { onDelete: "cascade" }),
    occurredAt: text("occurred_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    changeType: text("change_type", { enum: ["priceDropped", "priceIncreased", "backInStock", "outOfStock", "newProduct", "productRemoved", "imagesChanged"] as const }).notNull(),
    magnitude: text("magnitude", { enum: ["small", "medium", "large"] as const }).notNull().default("medium"),
    productTitle: text("product_title").notNull(),
    variantTitle: text("variant_title"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    priceChange: text("price_change"), // Decimal as string
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    productShopifyId: integer("product_shopify_id"), // nullable for removed products
    userId: text("user_id"), // nullable, future multi-tenancy
  },
  (table) => [
    index("idx_events_store").on(table.storeDomain),
    index("idx_events_occurred").on(table.occurredAt),
    index("idx_events_type").on(table.changeType),
    index("idx_events_unread").on(table.isRead, table.occurredAt),
    index("idx_events_product").on(table.productShopifyId),
  ],
);

// ---------------------------------------------------------------------------
// product_videos — first-class video URL tracking (mirrors productImages)
// ---------------------------------------------------------------------------

export const productVideos = sqliteTable(
  "product_videos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    src: text("src").notNull(),
    format: text("format", { enum: ["mp4", "webm", "m3u8", "youtube", "vimeo", "unknown"] as const })
      .notNull()
      .default("unknown"),
    height: integer("height"),
    position: integer("position").notNull().default(0),
    alt: text("alt"),
    firstSeenAt: text("first_seen_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    lastSeenAt: text("last_seen_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    isRemoved: integer("is_removed", { mode: "boolean" })
      .notNull()
      .default(false),
    removedAt: text("removed_at"),
    source: text("source", { enum: ["live_scrape", "wayback"] as const })
      .notNull()
      .default("live_scrape"),
    waybackTimestamp: text("wayback_timestamp"),
  },
  (table) => [
    index("idx_videos_product").on(table.productId),
    index("idx_videos_product_active").on(table.productId, table.isRemoved),
    index("idx_videos_src").on(table.src),
    index("idx_videos_first_seen").on(table.firstSeenAt),
  ],
);

// ---------------------------------------------------------------------------
// scrape_state — per-product scrape tracking
// ---------------------------------------------------------------------------

export const scrapeState = sqliteTable(
  "scrape_state",
  {
    productId: integer("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    lastScrapedAt: text("last_scraped_at"),
    scrapeStrategy: text("scrape_strategy"),
    scrapeStatus: text("scrape_status", { enum: ["pending", "success", "failed", "skipped"] as const })
      .notNull()
      .default("pending"),
    lastError: text("last_error"),
    videoCount: integer("video_count").notNull().default(0),
  },
);

// ---------------------------------------------------------------------------
// wayback_snapshots — CDX discovery results
// ---------------------------------------------------------------------------

export const waybackSnapshots = sqliteTable(
  "wayback_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    storeDomain: text("store_domain")
      .notNull()
      .references(() => stores.domain, { onDelete: "cascade" }),
    url: text("url").notNull(),
    handle: text("handle").notNull(),
    timestamp: text("timestamp").notNull(), // 14-digit wayback timestamp
    digest: text("digest").notNull(),
    statusCode: integer("status_code").notNull(),
    mimeType: text("mime_type").notNull(),
    length: integer("length").notNull().default(0),
    fetchStatus: text("fetch_status", { enum: ["pending", "fetched", "failed", "skipped"] as const })
      .notNull()
      .default("pending"),
    fetchedAt: text("fetched_at"),
    fetchError: text("fetch_error"),
  },
  (table) => [
    index("idx_wayback_store").on(table.storeDomain),
    index("idx_wayback_handle").on(table.handle),
    index("idx_wayback_digest").on(table.digest),
    index("idx_wayback_fetch_status").on(table.fetchStatus),
    index("idx_wayback_store_handle").on(table.storeDomain, table.handle),
  ],
);

// ---------------------------------------------------------------------------
// wayback_product_data — parsed data from fetched snapshots
// ---------------------------------------------------------------------------

export const waybackProductData = sqliteTable(
  "wayback_product_data",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => waybackSnapshots.id, { onDelete: "cascade" }),
    storeDomain: text("store_domain")
      .notNull()
      .references(() => stores.domain, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    title: text("title"),
    vendor: text("vendor"),
    productType: text("product_type"),
    extractionStrategy: text("extraction_strategy"),
    variantsJson: text("variants_json"), // JSON array of variant objects
    imagesJson: text("images_json"),     // JSON array of image URLs
    videosJson: text("videos_json"),     // JSON array of video objects
    rawPrice: text("raw_price"),
    capturedAt: text("captured_at").notNull(), // wayback timestamp as ISO
  },
  (table) => [
    index("idx_wpd_snapshot").on(table.snapshotId),
    index("idx_wpd_store").on(table.storeDomain),
    index("idx_wpd_handle").on(table.handle),
    index("idx_wpd_captured").on(table.capturedAt),
  ],
);

// ---------------------------------------------------------------------------
// archive_import_jobs — tracks overall import progress
// ---------------------------------------------------------------------------

export const archiveImportJobs = sqliteTable(
  "archive_import_jobs",
  {
    id: text("id").primaryKey(), // UUID
    storeDomain: text("store_domain")
      .notNull()
      .references(() => stores.domain, { onDelete: "cascade" }),
    status: text("status", { enum: ["discovering", "fetching", "completed", "failed"] as const })
      .notNull()
      .default("discovering"),
    totalSnapshots: integer("total_snapshots").notNull().default(0),
    fetchedSnapshots: integer("fetched_snapshots").notNull().default(0),
    failedSnapshots: integer("failed_snapshots").notNull().default(0),
    startedAt: text("started_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("idx_aij_store").on(table.storeDomain),
    index("idx_aij_status").on(table.status),
  ],
);

// ---------------------------------------------------------------------------
// queue_jobs — tracks high-level queue job lifecycle
// ---------------------------------------------------------------------------

export const queueJobs = sqliteTable(
  "queue_jobs",
  {
    id: text("id").primaryKey(), // UUID
    parentId: text("parent_id"), // self-FK: scrape_stale → its sync_store
    queue: text("queue", { enum: ["sync", "scrape"] as const }).notNull(),
    jobType: text("job_type", {
      enum: ["sync_store", "scrape_stale", "archive_discover"] as const,
    }).notNull(),
    storeDomain: text("store_domain").notNull(),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed"] as const,
    })
      .notNull()
      .default("queued"),
    createdAt: text("created_at").notNull(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    durationMs: integer("duration_ms"),
    attempt: integer("attempt").notNull().default(1),
    itemsEnqueued: integer("items_enqueued"), // fan-out count
    resultSummary: text("result_summary"), // e.g. "42 products, 3 changes"
    error: text("error"),
  },
  (table) => [
    index("idx_qj_status").on(table.status),
    index("idx_qj_created").on(table.createdAt),
    index("idx_qj_parent").on(table.parentId),
    index("idx_qj_store_type").on(table.storeDomain, table.jobType),
  ],
);

// ---------------------------------------------------------------------------
// relations (v2 — defineRelations)
// ---------------------------------------------------------------------------

export const relations = defineRelations(
  {
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
  },
  (r) => ({
    stores: {
      products: r.many.products(),
      changeEvents: r.many.changeEvents(),
      waybackSnapshots: r.many.waybackSnapshots(),
      archiveImportJobs: r.many.archiveImportJobs(),
    },
    products: {
      store: r.one.stores({
        from: r.products.storeDomain,
        to: r.stores.domain,
      }),
      variants: r.many.variants(),
      images: r.many.productImages(),
      videos: r.many.productVideos(),
      scrapeState: r.one.scrapeState({
        from: r.products.id,
        to: r.scrapeState.productId,
      }),
    },
    productImages: {
      product: r.one.products({
        from: r.productImages.productId,
        to: r.products.id,
      }),
    },
    productVideos: {
      product: r.one.products({
        from: r.productVideos.productId,
        to: r.products.id,
      }),
    },
    variants: {
      product: r.one.products({
        from: r.variants.productId,
        to: r.products.id,
      }),
      snapshots: r.many.variantSnapshots(),
    },
    variantSnapshots: {
      variant: r.one.variants({
        from: r.variantSnapshots.variantId,
        to: r.variants.id,
      }),
    },
    changeEvents: {
      store: r.one.stores({
        from: r.changeEvents.storeDomain,
        to: r.stores.domain,
      }),
    },
    scrapeState: {
      product: r.one.products({
        from: r.scrapeState.productId,
        to: r.products.id,
      }),
    },
    waybackSnapshots: {
      store: r.one.stores({
        from: r.waybackSnapshots.storeDomain,
        to: r.stores.domain,
      }),
      productData: r.many.waybackProductData(),
    },
    waybackProductData: {
      snapshot: r.one.waybackSnapshots({
        from: r.waybackProductData.snapshotId,
        to: r.waybackSnapshots.id,
      }),
      store: r.one.stores({
        from: r.waybackProductData.storeDomain,
        to: r.stores.domain,
      }),
    },
    archiveImportJobs: {
      store: r.one.stores({
        from: r.archiveImportJobs.storeDomain,
        to: r.stores.domain,
      }),
    },
    queueJobs: {},
  }),
);
