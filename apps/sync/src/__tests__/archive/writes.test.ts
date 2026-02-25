import { describe, expect, test } from "bun:test";
import { archiveFetchResultsToWriteOps, type ArchiveFetchResult } from "../../archive/writes";

const JOB_ID = "job-abc-123";

describe("archiveFetchResultsToWriteOps", () => {
  test("fetched result → productDataInserts has parsed data + snapshotUpdates status = fetched", () => {
    const results: ArchiveFetchResult[] = [{
      snapId: 1,
      status: "fetched",
      fetchedAt: "2025-06-15T12:00:00Z",
      data: {
        storeDomain: "example.myshopify.com",
        handle: "cool-product",
        capturedAt: "2024-03-15T10:30:00Z",
        title: "Cool Product",
        vendor: "TestVendor",
        productType: "Widget",
        extractionStrategy: "data-product-json",
        variantsJson: '[{"id":1,"title":"Default","price":"29.99"}]',
        imagesJson: '["https://cdn.shopify.com/1.jpg"]',
        videosJson: "[]",
        rawPrice: "29.99",
      },
    }];

    const ops = archiveFetchResultsToWriteOps(results, JOB_ID);

    expect(ops.snapshotUpdates).toHaveLength(1);
    expect(ops.snapshotUpdates[0].id).toBe(1);
    expect(ops.snapshotUpdates[0].fetchStatus).toBe("fetched");
    expect(ops.snapshotUpdates[0].fetchedAt).toBe("2025-06-15T12:00:00Z");
    expect(ops.snapshotUpdates[0].fetchError).toBeNull();

    expect(ops.productDataInserts).toHaveLength(1);
    expect(ops.productDataInserts[0].snapshotId).toBe(1);
    expect(ops.productDataInserts[0].storeDomain).toBe("example.myshopify.com");
    expect(ops.productDataInserts[0].handle).toBe("cool-product");
    expect(ops.productDataInserts[0].title).toBe("Cool Product");
    expect(ops.productDataInserts[0].extractionStrategy).toBe("data-product-json");
    expect(ops.productDataInserts[0].capturedAt).toBe("2024-03-15T10:30:00Z");
  });

  test("failed result → snapshotUpdates status = failed with error", () => {
    const results: ArchiveFetchResult[] = [{
      snapId: 2,
      status: "failed",
      fetchedAt: "2025-06-15T12:00:00Z",
      error: "HTTP 503",
    }];

    const ops = archiveFetchResultsToWriteOps(results, JOB_ID);

    expect(ops.snapshotUpdates).toHaveLength(1);
    expect(ops.snapshotUpdates[0].fetchStatus).toBe("failed");
    expect(ops.snapshotUpdates[0].fetchError).toBe("HTTP 503");

    expect(ops.productDataInserts).toHaveLength(0);
  });

  test("skipped result → snapshotUpdates status = skipped", () => {
    const results: ArchiveFetchResult[] = [{
      snapId: 3,
      status: "skipped",
      fetchedAt: "2025-06-15T12:00:00Z",
      error: "No parseable product data",
    }];

    const ops = archiveFetchResultsToWriteOps(results, JOB_ID);

    expect(ops.snapshotUpdates).toHaveLength(1);
    expect(ops.snapshotUpdates[0].fetchStatus).toBe("skipped");
    expect(ops.snapshotUpdates[0].fetchError).toBe("No parseable product data");

    expect(ops.productDataInserts).toHaveLength(0);
  });

  test("job counter has correct fetched/failed counts", () => {
    const results: ArchiveFetchResult[] = [
      {
        snapId: 1,
        status: "fetched",
        fetchedAt: "2025-06-15T12:00:00Z",
        data: {
          storeDomain: "example.myshopify.com",
          handle: "product-1",
          capturedAt: "2024-01-01T00:00:00Z",
          title: "Product 1",
          vendor: null,
          productType: null,
          extractionStrategy: "json-ld",
          variantsJson: "[]",
          imagesJson: "[]",
          videosJson: "[]",
          rawPrice: null,
        },
      },
      {
        snapId: 2,
        status: "failed",
        fetchedAt: "2025-06-15T12:00:01Z",
        error: "HTTP 500",
      },
      {
        snapId: 3,
        status: "skipped",
        fetchedAt: "2025-06-15T12:00:02Z",
        error: "No parseable product data",
      },
      {
        snapId: 4,
        status: "failed",
        fetchedAt: "2025-06-15T12:00:03Z",
        error: "Timeout",
      },
    ];

    const ops = archiveFetchResultsToWriteOps(results, JOB_ID);

    expect(ops.jobCounterIncrement).not.toBeNull();
    expect(ops.jobCounterIncrement!.jobId).toBe(JOB_ID);
    // fetched: 1 (fetched) + 1 (skipped) = 2
    expect(ops.jobCounterIncrement!.fetched).toBe(2);
    // failed: 2
    expect(ops.jobCounterIncrement!.failed).toBe(2);
  });

  test("empty results → jobCounterIncrement is null", () => {
    const ops = archiveFetchResultsToWriteOps([], JOB_ID);

    expect(ops.snapshotUpdates).toHaveLength(0);
    expect(ops.productDataInserts).toHaveLength(0);
    expect(ops.jobCounterIncrement).toBeNull();
  });
});
