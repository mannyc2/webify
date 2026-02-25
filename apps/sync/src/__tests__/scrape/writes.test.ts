import { describe, expect, test } from "bun:test";
import type { VideoDiffResult } from "@webify/core/parsing/video";
import { scrapeResultToWriteOps, scrapeSkippedWriteOps, scrapeFailedWriteOps } from "../../scrape/writes";

const NOW = "2025-06-15T12:00:00.000Z";
const PRODUCT_ID = 42;

describe("scrapeResultToWriteOps", () => {
  test("VideoDiffResult with inserts → videoInserts has correct fields", () => {
    const diff: VideoDiffResult = {
      toInsert: [
        { src: "https://cdn.shopify.com/video1.mp4", format: "mp4", height: 720, alt: "Demo video", position: 0 },
        { src: "https://cdn.shopify.com/video2.webm", format: "webm", height: null, alt: null, position: 1 },
      ],
      toUpdate: [],
      toSoftDelete: [],
    };

    const ops = scrapeResultToWriteOps(PRODUCT_ID, diff, NOW, "data-product-json");

    expect(ops.videoInserts).toHaveLength(2);
    expect(ops.videoInserts[0].productId).toBe(PRODUCT_ID);
    expect(ops.videoInserts[0].src).toBe("https://cdn.shopify.com/video1.mp4");
    expect(ops.videoInserts[0].format).toBe("mp4");
    expect(ops.videoInserts[0].height).toBe(720);
    expect(ops.videoInserts[0].alt).toBe("Demo video");
    expect(ops.videoInserts[0].position).toBe(0);
    expect(ops.videoInserts[0].firstSeenAt).toBe(NOW);
    expect(ops.videoInserts[0].lastSeenAt).toBe(NOW);
    expect(ops.videoInserts[0].isRemoved).toBe(false);
    expect(ops.videoInserts[0].source).toBe("live_scrape");

    expect(ops.videoInserts[1].src).toBe("https://cdn.shopify.com/video2.webm");
    expect(ops.videoInserts[1].height).toBeNull();
    expect(ops.videoInserts[1].alt).toBeNull();
  });

  test("VideoDiffResult with updates → videoUpdates has correct id and values", () => {
    const diff: VideoDiffResult = {
      toInsert: [],
      toUpdate: [
        { id: 101, position: 0, format: "mp4", height: 1080, alt: "Updated alt" },
      ],
      toSoftDelete: [],
    };

    const ops = scrapeResultToWriteOps(PRODUCT_ID, diff, NOW, "meta-variable");

    expect(ops.videoUpdates).toHaveLength(1);
    expect(ops.videoUpdates[0].id).toBe(101);
    expect(ops.videoUpdates[0].values.lastSeenAt).toBe(NOW);
    expect(ops.videoUpdates[0].values.position).toBe(0);
    expect(ops.videoUpdates[0].values.format).toBe("mp4");
    expect(ops.videoUpdates[0].values.height).toBe(1080);
    expect(ops.videoUpdates[0].values.alt).toBe("Updated alt");
    expect(ops.videoUpdates[0].values.isRemoved).toBe(false);
    expect(ops.videoUpdates[0].values.removedAt).toBeNull();
    expect(ops.videoUpdates[0].values.source).toBe("live_scrape");
  });

  test("VideoDiffResult with soft-deletes → videoSoftDeletes has correct id and removedAt", () => {
    const diff: VideoDiffResult = {
      toInsert: [],
      toUpdate: [],
      toSoftDelete: [{ id: 201 }, { id: 202 }],
    };

    const ops = scrapeResultToWriteOps(PRODUCT_ID, diff, NOW, "product-variable");

    expect(ops.videoSoftDeletes).toHaveLength(2);
    expect(ops.videoSoftDeletes[0].id).toBe(201);
    expect(ops.videoSoftDeletes[0].removedAt).toBe(NOW);
    expect(ops.videoSoftDeletes[1].id).toBe(202);
  });

  test("scrapeState for success has correct strategy and video count", () => {
    const diff: VideoDiffResult = {
      toInsert: [
        { src: "https://cdn.shopify.com/v1.mp4", format: "mp4", height: 720, alt: null, position: 0 },
      ],
      toUpdate: [
        { id: 101, position: 1, format: "webm", height: null, alt: null },
      ],
      toSoftDelete: [],
    };

    const ops = scrapeResultToWriteOps(PRODUCT_ID, diff, NOW, "data-product-json");

    expect(ops.scrapeStateUpsert.productId).toBe(PRODUCT_ID);
    expect(ops.scrapeStateUpsert.lastScrapedAt).toBe(NOW);
    expect(ops.scrapeStateUpsert.scrapeStrategy).toBe("data-product-json");
    expect(ops.scrapeStateUpsert.scrapeStatus).toBe("success");
    expect(ops.scrapeStateUpsert.lastError).toBeNull();
    expect(ops.scrapeStateUpsert.videoCount).toBe(2); // 1 insert + 1 update
  });
});

describe("scrapeSkippedWriteOps", () => {
  test("returns skipped status with error message", () => {
    const ops = scrapeSkippedWriteOps(PRODUCT_ID, NOW, "No parseable product data found");

    expect(ops.videoInserts).toHaveLength(0);
    expect(ops.videoUpdates).toHaveLength(0);
    expect(ops.videoSoftDeletes).toHaveLength(0);
    expect(ops.scrapeStateUpsert.scrapeStatus).toBe("skipped");
    expect(ops.scrapeStateUpsert.scrapeStrategy).toBeNull();
    expect(ops.scrapeStateUpsert.lastError).toBe("No parseable product data found");
    expect(ops.scrapeStateUpsert.videoCount).toBe(0);
  });
});

describe("scrapeFailedWriteOps", () => {
  test("returns failed status with truncated error", () => {
    const longError = "x".repeat(600);
    const ops = scrapeFailedWriteOps(PRODUCT_ID, NOW, longError);

    expect(ops.scrapeStateUpsert.scrapeStatus).toBe("failed");
    expect(ops.scrapeStateUpsert.lastError!.length).toBe(500);
    expect(ops.scrapeStateUpsert.videoCount).toBe(0);
  });
});
