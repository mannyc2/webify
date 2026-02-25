import type { Database } from "@webify/db";
import { getStaleProducts } from "@webify/db";
import { createLogger } from "@webify/db";
import type { ScrapeJobMessage } from "./types";

const log = createLogger("scrape-stale");

// Re-scrape every 24 hours
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function handleScrapeStale(
  db: Database,
  domain: string,
  queue: Queue<ScrapeJobMessage>,
): Promise<void> {
  const staleProducts = await getStaleProducts(db, domain, STALE_THRESHOLD_MS);

  for (const product of staleProducts) {
    await queue.send({
      type: "scrape_product",
      domain,
      productId: product.id,
      handle: product.handle,
    });
  }

  log.info("scrape_stale fan-out", { domain, enqueued: staleProducts.length });
}
