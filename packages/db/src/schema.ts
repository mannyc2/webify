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
// relations (v2 — defineRelations)
// ---------------------------------------------------------------------------

export const relations = defineRelations(
  { stores, products, productImages, variants, variantSnapshots, changeEvents },
  (r) => ({
    stores: {
      products: r.many.products(),
      changeEvents: r.many.changeEvents(),
    },
    products: {
      store: r.one.stores({
        from: r.products.storeDomain,
        to: r.stores.domain,
      }),
      variants: r.many.variants(),
      images: r.many.productImages(),
    },
    productImages: {
      product: r.one.products({
        from: r.productImages.productId,
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
  }),
);
