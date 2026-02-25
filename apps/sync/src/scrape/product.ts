// Per-product scrape handler — thin IO shell

import type { Database } from "@webify/db";
import { parseProductPage } from "@webify/core/parsing";
import { computeVideoDiff } from "@webify/core/parsing/video";
import { batchExecute } from "@webify/db/batch";
import { createLogger } from "@webify/db";
import {
  scrapeResultToWriteOps,
  scrapeSkippedWriteOps,
  scrapeFailedWriteOps,
  materializeScrapeWrites,
} from "./writes";

const log = createLogger("scrape");

export async function handleScrapeProduct(
  db: Database,
  domain: string,
  productId: number,
  handle: string,
): Promise<void> {
  const now = new Date().toISOString();

  try {
    // 1. Fetch product page HTML (IO)
    const url = `https://${domain}/products/${handle}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Webify/1.0", Accept: "text/html" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();

    // 2. Parse product page (pure — @webify/core)
    const result = await parseProductPage(html);

    if (!result) {
      const ops = scrapeSkippedWriteOps(productId, now, "No parseable product data found");
      const writes = materializeScrapeWrites(db, ops);
      await batchExecute(db, writes);
      return;
    }

    const { strategy, product } = result;

    // 3. Load existing videos (IO)
    const existingVideos = await db.query.productVideos.findMany({
      where: { productId },
    });

    // 4. Compute video diff (pure — @webify/core)
    const diff = computeVideoDiff(
      existingVideos.map(v => ({ id: v.id, src: v.src, isRemoved: v.isRemoved })),
      product.videos,
    );

    // 5. Map diff → write operations (pure — returns plain data)
    const ops = scrapeResultToWriteOps(productId, diff, now, strategy);

    // 6. Materialize data → Drizzle queries
    const writes = materializeScrapeWrites(db, ops);

    // 7. Execute all writes in one db.batch() call (IO)
    await batchExecute(db, writes);

    log.info("scrape complete", { domain, productId, handle, strategy, videoCount: product.videos.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ops = scrapeFailedWriteOps(productId, now, message);
    const writes = materializeScrapeWrites(db, ops);
    await batchExecute(db, writes);
    throw error;
  }
}
