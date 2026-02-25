import { eq, inArray, and, or, lt, isNull } from "drizzle-orm";
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
