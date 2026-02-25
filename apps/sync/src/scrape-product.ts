import { eq } from "drizzle-orm";
import type { Database } from "@webify/db";
import { productVideos, scrapeState } from "@webify/db";
import { parseProductPage } from "@webify/core";
import { createLogger } from "@webify/db";

const log = createLogger("scrape");

export async function handleScrapeProduct(
  db: Database,
  domain: string,
  productId: number,
  handle: string,
): Promise<void> {
  const now = new Date().toISOString();

  try {
    // Fetch the product page HTML
    const url = `https://${domain}/products/${handle}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Webify/1.0", Accept: "text/html" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();
    const result = await parseProductPage(html);

    if (!result) {
      // Update scrape state as skipped (no parseable data)
      await db.insert(scrapeState).values({
        productId,
        lastScrapedAt: now,
        scrapeStatus: "skipped",
        scrapeStrategy: null,
        lastError: "No parseable product data found",
        videoCount: 0,
      }).onConflictDoUpdate({
        target: scrapeState.productId,
        set: {
          lastScrapedAt: now,
          scrapeStatus: "skipped",
          scrapeStrategy: null,
          lastError: "No parseable product data found",
          videoCount: 0,
        },
      });
      return;
    }

    const { strategy, product } = result;
    const videos = product.videos;

    // Soft-delete pattern for videos (same as images in sync.ts)
    // 1. Get existing active videos for this product
    const existingVideos = await db.query.productVideos.findMany({
      where: { productId },
    });
    const existingSrcMap = new Map(existingVideos.map(v => [v.src, v]));
    const fetchedSrcs = new Set(videos.map(v => v.src));

    // 2. Upsert each video from the scrape
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const existing = existingSrcMap.get(video.src);
      if (existing) {
        // Update lastSeenAt, restore if was removed
        await db.update(productVideos)
          .set({
            lastSeenAt: now,
            position: i,
            format: video.format,
            height: video.height,
            alt: video.alt,
            isRemoved: false,
            removedAt: null,
            source: "live_scrape",
          })
          .where(eq(productVideos.id, existing.id));
      } else {
        // Insert new video
        await db.insert(productVideos).values({
          productId,
          src: video.src,
          format: video.format,
          height: video.height,
          position: i,
          alt: video.alt,
          firstSeenAt: now,
          lastSeenAt: now,
          isRemoved: false,
          source: "live_scrape",
        });
      }
    }

    // 3. Soft-delete videos no longer found
    for (const existing of existingVideos) {
      if (!fetchedSrcs.has(existing.src) && !existing.isRemoved) {
        await db.update(productVideos)
          .set({ isRemoved: true, removedAt: now })
          .where(eq(productVideos.id, existing.id));
      }
    }

    // 4. Update scrape state
    await db.insert(scrapeState).values({
      productId,
      lastScrapedAt: now,
      scrapeStrategy: strategy,
      scrapeStatus: "success",
      lastError: null,
      videoCount: videos.length,
    }).onConflictDoUpdate({
      target: scrapeState.productId,
      set: {
        lastScrapedAt: now,
        scrapeStrategy: strategy,
        scrapeStatus: "success",
        lastError: null,
        videoCount: videos.length,
      },
    });

    log.info("scrape complete", { domain, productId, handle, strategy, videoCount: videos.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.insert(scrapeState).values({
      productId,
      lastScrapedAt: now,
      scrapeStatus: "failed",
      lastError: message.slice(0, 500),
      videoCount: 0,
    }).onConflictDoUpdate({
      target: scrapeState.productId,
      set: {
        lastScrapedAt: now,
        scrapeStatus: "failed",
        lastError: message.slice(0, 500),
      },
    });
    throw error; // Re-throw so the queue message gets retried
  }
}
