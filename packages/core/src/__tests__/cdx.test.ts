import { describe, expect, test } from "bun:test";
import {
  parseCdxRow,
  isProductPage,
  waybackTimestampToISO,
  extractProductHandle,
  filterNewSnapshots,
  deduplicateByDigestDay,
} from "../clients/cdx";
import type { WaybackSnapshot } from "../wayback-types";

// ---------------------------------------------------------------------------
// parseCdxRow
// ---------------------------------------------------------------------------

describe("parseCdxRow", () => {
  test("standard row parses all fields", () => {
    const row = [
      "com,example)/products/cool-widget",
      "20230115143022",
      "https://example.com/products/cool-widget",
      "text/html",
      "200",
      "ABC123DIGEST",
      "12345",
    ];
    const snap = parseCdxRow(row);
    expect(snap.url).toBe("https://example.com/products/cool-widget");
    expect(snap.handle).toBe("cool-widget");
    expect(snap.timestamp).toBe("20230115143022");
    expect(snap.digest).toBe("ABC123DIGEST");
    expect(snap.statusCode).toBe(200);
    expect(snap.mimeType).toBe("text/html");
    expect(snap.length).toBe(12345);
  });

  test("URL with handle extracts correctly", () => {
    const row = [
      "com,shop)/products/super-gadget",
      "20240601120000",
      "https://shop.com/products/super-gadget",
      "text/html",
      "200",
      "XYZ789",
      "5000",
    ];
    const snap = parseCdxRow(row);
    expect(snap.handle).toBe("super-gadget");
  });
});

// ---------------------------------------------------------------------------
// isProductPage
// ---------------------------------------------------------------------------

describe("isProductPage", () => {
  function makeSnap(handle: string, url?: string): WaybackSnapshot {
    return {
      url: url ?? `https://example.com/products/${handle}`,
      handle,
      timestamp: "20230101000000",
      digest: "ABC",
      statusCode: 200,
      mimeType: "text/html",
      length: 1000,
    };
  }

  test("normal product page returns true", () => {
    expect(isProductPage(makeSnap("cool-widget"))).toBe(true);
  });

  test("URL with 'page' in handle returns false", () => {
    expect(isProductPage(makeSnap("page-2"))).toBe(false);
  });

  test("URL with 'collections' in handle returns false", () => {
    expect(isProductPage(makeSnap("collections-summer"))).toBe(false);
  });

  test("URL with '.js' in handle returns false", () => {
    expect(isProductPage(makeSnap("product.js"))).toBe(false);
  });

  test("empty handle returns false", () => {
    expect(isProductPage(makeSnap(""))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// waybackTimestampToISO
// ---------------------------------------------------------------------------

describe("waybackTimestampToISO", () => {
  test("20230115143022 converts correctly", () => {
    expect(waybackTimestampToISO("20230115143022")).toBe("2023-01-15T14:30:22Z");
  });

  test("20200101000000 converts correctly", () => {
    expect(waybackTimestampToISO("20200101000000")).toBe("2020-01-01T00:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// extractProductHandle
// ---------------------------------------------------------------------------

describe("extractProductHandle", () => {
  test("standard product URL", () => {
    expect(extractProductHandle("https://example.com/products/cool-widget")).toBe("cool-widget");
  });

  test("product URL with query params", () => {
    expect(extractProductHandle("https://example.com/products/widget?v=1")).toBe("widget");
  });

  test("URL without /products/ path", () => {
    expect(extractProductHandle("https://example.com/no-products")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// filterNewSnapshots
// ---------------------------------------------------------------------------

describe("filterNewSnapshots", () => {
  function makeSnap(digest: string, timestamp: string): WaybackSnapshot {
    return {
      url: "https://example.com/products/widget",
      handle: "widget",
      timestamp,
      digest,
      statusCode: 200,
      mimeType: "text/html",
      length: 1000,
    };
  }

  test("filters out snapshots with matching digest:timestamp keys", () => {
    const snaps = [
      makeSnap("ABC", "20230101000000"),
      makeSnap("DEF", "20230201000000"),
    ];
    const existing = new Set(["ABC:20230101000000"]);
    const result = filterNewSnapshots(snaps, existing);
    expect(result).toHaveLength(1);
    expect(result[0].digest).toBe("DEF");
  });

  test("keeps snapshots not in existing set", () => {
    const snaps = [makeSnap("NEW", "20230301000000")];
    const existing = new Set(["OLD:20230101000000"]);
    const result = filterNewSnapshots(snaps, existing);
    expect(result).toHaveLength(1);
  });

  test("empty existing set: all pass through", () => {
    const snaps = [
      makeSnap("ABC", "20230101000000"),
      makeSnap("DEF", "20230201000000"),
    ];
    const result = filterNewSnapshots(snaps, new Set());
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// deduplicateByDigestDay
// ---------------------------------------------------------------------------

describe("deduplicateByDigestDay", () => {
  function makeSnap(digest: string, timestamp: string): WaybackSnapshot {
    return {
      url: "https://example.com/products/widget",
      handle: "widget",
      timestamp,
      digest,
      statusCode: 200,
      mimeType: "text/html",
      length: 1000,
    };
  }

  test("same digest, same day: deduplicated", () => {
    const snaps = [
      makeSnap("ABC", "20230115100000"),
      makeSnap("ABC", "20230115140000"),
    ];
    const result = deduplicateByDigestDay(snaps);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe("20230115100000");
  });

  test("same digest, different day: kept", () => {
    const snaps = [
      makeSnap("ABC", "20230115100000"),
      makeSnap("ABC", "20230116100000"),
    ];
    const result = deduplicateByDigestDay(snaps);
    expect(result).toHaveLength(2);
  });

  test("different digest, same day: kept", () => {
    const snaps = [
      makeSnap("ABC", "20230115100000"),
      makeSnap("DEF", "20230115140000"),
    ];
    const result = deduplicateByDigestDay(snaps);
    expect(result).toHaveLength(2);
  });
});
