// Pure write-mapping + materialization for scrape-product handler

import { eq } from "drizzle-orm";
import type { Database } from "@webify/db";
import { productVideos, scrapeState } from "@webify/db";
import type { VideoFormat } from "@webify/db";
import type { WriteOp } from "@webify/db/batch";
import type { VideoDiffResult } from "@webify/core/parsing/video";

// ---------------------------------------------------------------------------
// Layer 1: Pure data mapping (no db, no Drizzle)
// ---------------------------------------------------------------------------

export interface ScrapeWriteOps {
  videoInserts: {
    productId: number;
    src: string;
    format: VideoFormat;
    height: number | null;
    position: number;
    alt: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
    isRemoved: false;
    source: "live_scrape";
  }[];
  videoUpdates: {
    id: number;
    values: {
      lastSeenAt: string;
      position: number;
      format: VideoFormat;
      height: number | null;
      alt: string | null;
      isRemoved: false;
      removedAt: null;
      source: "live_scrape";
    };
  }[];
  videoSoftDeletes: { id: number; removedAt: string }[];
  scrapeStateUpsert: {
    productId: number;
    lastScrapedAt: string;
    scrapeStrategy: string | null;
    scrapeStatus: "success" | "skipped" | "failed";
    lastError: string | null;
    videoCount: number;
  };
}

export function scrapeResultToWriteOps(
  productId: number,
  diff: VideoDiffResult,
  now: string,
  strategy: string,
): ScrapeWriteOps {
  return {
    videoInserts: diff.toInsert.map(v => ({
      productId,
      src: v.src,
      format: v.format as VideoFormat,
      height: v.height,
      position: v.position,
      alt: v.alt,
      firstSeenAt: now,
      lastSeenAt: now,
      isRemoved: false as const,
      source: "live_scrape" as const,
    })),
    videoUpdates: diff.toUpdate.map(v => ({
      id: v.id,
      values: {
        lastSeenAt: now,
        position: v.position,
        format: v.format as VideoFormat,
        height: v.height,
        alt: v.alt,
        isRemoved: false as const,
        removedAt: null,
        source: "live_scrape" as const,
      },
    })),
    videoSoftDeletes: diff.toSoftDelete.map(v => ({
      id: v.id,
      removedAt: now,
    })),
    scrapeStateUpsert: {
      productId,
      lastScrapedAt: now,
      scrapeStrategy: strategy,
      scrapeStatus: "success",
      lastError: null,
      videoCount: diff.toInsert.length + diff.toUpdate.length,
    },
  };
}

export function scrapeSkippedWriteOps(
  productId: number,
  now: string,
  error: string,
): ScrapeWriteOps {
  return {
    videoInserts: [],
    videoUpdates: [],
    videoSoftDeletes: [],
    scrapeStateUpsert: {
      productId,
      lastScrapedAt: now,
      scrapeStrategy: null,
      scrapeStatus: "skipped",
      lastError: error,
      videoCount: 0,
    },
  };
}

export function scrapeFailedWriteOps(
  productId: number,
  now: string,
  error: string,
): ScrapeWriteOps {
  return {
    videoInserts: [],
    videoUpdates: [],
    videoSoftDeletes: [],
    scrapeStateUpsert: {
      productId,
      lastScrapedAt: now,
      scrapeStrategy: null,
      scrapeStatus: "failed",
      lastError: error.slice(0, 500),
      videoCount: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Layer 2: Materialize (thin, needs db)
// ---------------------------------------------------------------------------

export function materializeScrapeWrites(db: Database, ops: ScrapeWriteOps): WriteOp[] {
  const writes: WriteOp[] = [];

  for (const v of ops.videoInserts) {
    writes.push(db.insert(productVideos).values(v));
  }

  for (const v of ops.videoUpdates) {
    writes.push(
      db.update(productVideos).set(v.values).where(eq(productVideos.id, v.id)),
    );
  }

  for (const v of ops.videoSoftDeletes) {
    writes.push(
      db
        .update(productVideos)
        .set({ isRemoved: true, removedAt: v.removedAt })
        .where(eq(productVideos.id, v.id)),
    );
  }

  const ss = ops.scrapeStateUpsert;
  writes.push(
    db
      .insert(scrapeState)
      .values(ss)
      .onConflictDoUpdate({
        target: scrapeState.productId,
        set: {
          lastScrapedAt: ss.lastScrapedAt,
          scrapeStrategy: ss.scrapeStrategy,
          scrapeStatus: ss.scrapeStatus,
          lastError: ss.lastError,
          videoCount: ss.videoCount,
        },
      }),
  );

  return writes;
}
