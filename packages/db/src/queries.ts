import { eq, inArray, and, or, lt, isNull, desc } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema, typeof schema.relations>;

// ---------------------------------------------------------------------------
// stores
// ---------------------------------------------------------------------------

export function getStores(db: Database) {
  return db.query.stores.findMany({
    orderBy: { name: "asc" },
  });
}

export function getStoreByDomain(db: Database, domain: string) {
  return db.query.stores.findFirst({
    where: { domain },
  });
}

export const getStoreById = getStoreByDomain;

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------

export function getProductsByStore(
  db: Database,
  storeDomain: string,
  options?: {
    search?: string;
    stock?: "all" | "in" | "out";
    sort?: "name" | "price_asc" | "price_desc" | "recent";
    productType?: string;
    offset?: number;
    limit?: number;
  },
) {
  const where: Record<string, unknown> = {
    storeDomain,
    isRemoved: false,
  };

  if (options?.search) {
    where.titleSearchKey = { like: `%${options.search.toLowerCase()}%` };
  }

  if (options?.stock === "in") {
    where.cachedIsAvailable = true;
  } else if (options?.stock === "out") {
    where.cachedIsAvailable = false;
  }

  if (options?.productType) {
    const types = options.productType.split(",").map((t) => t.trim()).filter(Boolean);
    if (types.length === 1) {
      where.productType = types[0];
    } else if (types.length > 1) {
      where.productType = { in: types };
    }
  }

  let orderBy: Record<string, string>;
  switch (options?.sort) {
    case "price_asc":
      orderBy = { cachedPrice: "asc" };
      break;
    case "price_desc":
      orderBy = { cachedPrice: "desc" };
      break;
    case "recent":
      orderBy = { firstSeenAt: "desc" };
      break;
    default:
      orderBy = { title: "asc" };
  }

  return db.query.products.findMany({
    where,
    orderBy,
    offset: options?.offset ?? 0,
    limit: options?.limit ?? 50,
  });
}

export async function getProductTypesByStore(
  db: Database,
  storeDomain: string,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ productType: schema.products.productType })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.storeDomain, storeDomain),
        eq(schema.products.isRemoved, false),
      ),
    )
    .orderBy(schema.products.productType);

  return rows
    .map((r) => r.productType)
    .filter((t): t is string => t != null && t !== "");
}

export function getProductById(db: Database, productId: number) {
  return db.query.products.findFirst({
    where: { id: productId },
    with: {
      variants: {
        orderBy: { position: "asc" },
      },
      images: {
        where: { isRemoved: false },
        orderBy: { position: "asc" },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// product images
// ---------------------------------------------------------------------------

export function getProductImages(
  db: Database,
  productId: number,
  options?: { includeRemoved?: boolean },
) {
  const where: Record<string, unknown> = { productId };

  if (!options?.includeRemoved) {
    where.isRemoved = false;
  }

  return db.query.productImages.findMany({
    where,
    orderBy: { position: "asc" },
  });
}

/** Get image URLs added since a given timestamp (for incremental client sync). */
export function getNewImagesSince(db: Database, since: string) {
  return db.query.productImages.findMany({
    where: { firstSeenAt: { gt: since } },
    orderBy: { firstSeenAt: "desc" },
  });
}

/** Get image URLs removed since a given timestamp. */
export function getRemovedImagesSince(db: Database, since: string) {
  return db.query.productImages.findMany({
    where: {
      isRemoved: true,
      removedAt: { gt: since },
    },
    orderBy: { removedAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// variant snapshots
// ---------------------------------------------------------------------------

export function getVariantSnapshots(
  db: Database,
  variantId: number,
  options?: { since?: string },
) {
  const where: Record<string, unknown> = { variantId };

  if (options?.since) {
    where.capturedAt = { gte: options.since };
  }

  return db.query.variantSnapshots.findMany({
    where,
    orderBy: { capturedAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// change events
// ---------------------------------------------------------------------------

export function getEvents(
  db: Database,
  options?: {
    storeDomain?: string;
    changeType?: string;
    since?: string;
    isRead?: boolean;
    offset?: number;
    limit?: number;
  },
) {
  const where: Record<string, unknown> = {};

  if (options?.storeDomain) {
    where.storeDomain = options.storeDomain;
  }
  if (options?.changeType) {
    where.changeType = options.changeType;
  }
  if (options?.since) {
    where.occurredAt = { gte: options.since };
  }
  if (options?.isRead !== undefined) {
    where.isRead = options.isRead;
  }

  return db.query.changeEvents.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { occurredAt: "desc" },
    offset: options?.offset ?? 0,
    limit: options?.limit ?? 50,
  });
}

export function markEventRead(db: Database, eventId: string, isRead: boolean) {
  return db
    .update(schema.changeEvents)
    .set({ isRead })
    .where(eq(schema.changeEvents.id, eventId));
}

export function markEventsReadBatch(db: Database, eventIds: string[]) {
  return db
    .update(schema.changeEvents)
    .set({ isRead: true })
    .where(inArray(schema.changeEvents.id, eventIds));
}

// ---------------------------------------------------------------------------
// product videos
// ---------------------------------------------------------------------------

export function getProductVideos(
  db: Database,
  productId: number,
  options?: { includeRemoved?: boolean },
) {
  const where: Record<string, unknown> = { productId };

  if (!options?.includeRemoved) {
    where.isRemoved = false;
  }

  return db.query.productVideos.findMany({
    where,
    orderBy: { position: "asc" },
  });
}

export function getProductVideosActive(db: Database, productId: number) {
  return db.query.productVideos.findMany({
    where: { productId, isRemoved: false },
    orderBy: { position: "asc" },
  });
}

// ---------------------------------------------------------------------------
// scrape state
// ---------------------------------------------------------------------------

export function getScrapeState(db: Database, productId: number) {
  return db.query.scrapeState.findFirst({
    where: { productId },
  });
}

export function getStaleProducts(
  db: Database,
  storeDomain: string,
  staleThresholdMs: number,
) {
  const threshold = new Date(Date.now() - staleThresholdMs).toISOString();

  return db
    .select({ id: schema.products.id, handle: schema.products.handle })
    .from(schema.products)
    .leftJoin(schema.scrapeState, eq(schema.products.id, schema.scrapeState.productId))
    .where(
      and(
        eq(schema.products.storeDomain, storeDomain),
        eq(schema.products.isRemoved, false),
        or(
          isNull(schema.scrapeState.productId),
          lt(schema.scrapeState.lastScrapedAt, threshold),
        ),
      ),
    );
}

// ---------------------------------------------------------------------------
// wayback snapshots
// ---------------------------------------------------------------------------

export function getPendingSnapshots(
  db: Database,
  storeDomain: string,
  options?: { limit?: number },
) {
  return db.query.waybackSnapshots.findMany({
    where: { storeDomain, fetchStatus: "pending" },
    orderBy: { timestamp: "asc" },
    limit: options?.limit ?? 50,
  });
}

export function getSnapshotsByHandle(
  db: Database,
  storeDomain: string,
  handle: string,
) {
  return db.query.waybackSnapshots.findMany({
    where: { storeDomain, handle },
    orderBy: { timestamp: "asc" },
  });
}

// ---------------------------------------------------------------------------
// archive import jobs
// ---------------------------------------------------------------------------

export function getArchiveImportJob(db: Database, jobId: string) {
  return db.query.archiveImportJobs.findFirst({
    where: { id: jobId },
  });
}

export function getArchiveImportJobs(db: Database, storeDomain: string) {
  return db.query.archiveImportJobs.findMany({
    where: { storeDomain },
    orderBy: { startedAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// archived images — images from wayback data not in current product images
// ---------------------------------------------------------------------------

export async function getArchivedImagesByHandle(
  db: Database,
  storeDomain: string,
  handle: string,
  currentImageUrls: string[],
) {
  const rows = await db.query.waybackProductData.findMany({
    where: { storeDomain, handle },
    orderBy: { capturedAt: "asc" },
  });

  // Collect all images across snapshots, tracking first/last seen
  const imageMap = new Map<string, { url: string; firstSeen: string; lastSeen: string }>();
  const currentSet = new Set(currentImageUrls);

  for (const row of rows) {
    if (!row.imagesJson) continue;
    let urls: string[];
    try {
      urls = JSON.parse(row.imagesJson);
    } catch {
      continue;
    }
    for (const url of urls) {
      if (typeof url !== "string" || currentSet.has(url)) continue;
      const existing = imageMap.get(url);
      if (existing) {
        if (row.capturedAt < existing.firstSeen) existing.firstSeen = row.capturedAt;
        if (row.capturedAt > existing.lastSeen) existing.lastSeen = row.capturedAt;
      } else {
        imageMap.set(url, { url, firstSeen: row.capturedAt, lastSeen: row.capturedAt });
      }
    }
  }

  return Array.from(imageMap.values());
}

// ---------------------------------------------------------------------------
// archived products — products only in wayback data, not in products table
// ---------------------------------------------------------------------------

export async function getArchivedProducts(
  db: Database,
  storeDomain: string,
  options?: {
    search?: string;
    sort?: "name" | "recent";
    offset?: number;
    limit?: number;
  },
) {
  // Get all handles that exist in the live products table
  const liveHandles = await db
    .selectDistinct({ handle: schema.products.handle })
    .from(schema.products)
    .where(eq(schema.products.storeDomain, storeDomain));
  const liveSet = new Set(liveHandles.map((r) => r.handle));

  // Get latest wayback_product_data row per handle
  const allRows = await db
    .select()
    .from(schema.waybackProductData)
    .where(eq(schema.waybackProductData.storeDomain, storeDomain))
    .orderBy(desc(schema.waybackProductData.capturedAt));

  // Deduplicate: keep latest row per handle, exclude live handles
  const handleMap = new Map<string, typeof allRows[number]>();
  const snapshotCounts = new Map<string, number>();

  for (const row of allRows) {
    if (liveSet.has(row.handle)) continue;
    snapshotCounts.set(row.handle, (snapshotCounts.get(row.handle) ?? 0) + 1);
    if (!handleMap.has(row.handle)) {
      handleMap.set(row.handle, row);
    }
  }

  let results = Array.from(handleMap.values());

  // Search filter
  if (options?.search) {
    const term = options.search.toLowerCase();
    results = results.filter((r) => r.title?.toLowerCase().includes(term));
  }

  // Sort
  if (options?.sort === "recent") {
    results.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  } else {
    results.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  }

  const total = results.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;
  results = results.slice(offset, offset + limit);

  return {
    data: results.map((r) => {
      let thumbnail: string | null = null;
      try {
        const imgs = JSON.parse(r.imagesJson ?? "[]");
        if (imgs.length > 0) thumbnail = imgs[0];
      } catch { /* ignore */ }
      return {
        handle: r.handle,
        title: r.title ?? r.handle,
        vendor: r.vendor,
        productType: r.productType,
        rawPrice: r.rawPrice,
        capturedAt: r.capturedAt,
        thumbnail,
        snapshotCount: snapshotCounts.get(r.handle) ?? 1,
      };
    }),
    total,
  };
}

// ---------------------------------------------------------------------------
// archived product detail — all wayback data for a single handle
// ---------------------------------------------------------------------------

export async function getArchivedProductByHandle(
  db: Database,
  storeDomain: string,
  handle: string,
) {
  const rows = await db
    .select()
    .from(schema.waybackProductData)
    .where(
      and(
        eq(schema.waybackProductData.storeDomain, storeDomain),
        eq(schema.waybackProductData.handle, handle),
      ),
    )
    .orderBy(desc(schema.waybackProductData.capturedAt));

  if (rows.length === 0) return null;

  const latest = rows[0];

  let images: string[] = [];
  try { images = JSON.parse(latest.imagesJson ?? "[]"); } catch { /* ignore */ }

  let variants: Array<Record<string, unknown>> = [];
  try { variants = JSON.parse(latest.variantsJson ?? "[]"); } catch { /* ignore */ }

  return {
    handle: latest.handle,
    title: latest.title ?? latest.handle,
    vendor: latest.vendor,
    productType: latest.productType,
    rawPrice: latest.rawPrice,
    capturedAt: latest.capturedAt,
    images,
    variants,
    timeline: rows.map((r) => ({
      id: r.id,
      capturedAt: r.capturedAt,
      title: r.title,
      rawPrice: r.rawPrice,
      extractionStrategy: r.extractionStrategy,
    })),
  };
}
