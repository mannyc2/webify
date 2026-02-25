import { describe, expect, test } from "bun:test";
import { ChangeType, ChangeMagnitude } from "@webify/db";
import {
  calculateMagnitude,
  detectPriceChanges,
  detectStockChanges,
  detectImageChanges,
} from "../diff";

// ---------------------------------------------------------------------------
// calculateMagnitude
// ---------------------------------------------------------------------------

describe("calculateMagnitude", () => {
  test("small change (<= 10%)", () => {
    expect(calculateMagnitude("100.00", "95.00")).toBe(ChangeMagnitude.small);
    expect(calculateMagnitude("100.00", "105.00")).toBe(ChangeMagnitude.small);
  });

  test("medium change (10-25%)", () => {
    expect(calculateMagnitude("100.00", "85.00")).toBe(ChangeMagnitude.medium);
    expect(calculateMagnitude("100.00", "120.00")).toBe(ChangeMagnitude.medium);
  });

  test("large change (> 25%)", () => {
    expect(calculateMagnitude("100.00", "50.00")).toBe(ChangeMagnitude.large);
    expect(calculateMagnitude("100.00", "200.00")).toBe(ChangeMagnitude.large);
  });

  test("zero old price returns medium", () => {
    expect(calculateMagnitude("0.00", "29.99")).toBe(ChangeMagnitude.medium);
  });
});

// ---------------------------------------------------------------------------
// detectPriceChanges
// ---------------------------------------------------------------------------

describe("detectPriceChanges", () => {
  const baseVariant = {
    id: 1,
    title: "Default",
    price: "29.99",
    compareAtPrice: null,
    available: true,
  };

  const baseFetched = {
    id: 100,
    title: "Default",
    sku: null,
    price: "29.99",
    compare_at_price: null,
    available: true,
    position: 1,
  };

  test("price drop", () => {
    const result = detectPriceChanges(
      baseVariant,
      { ...baseFetched, price: "19.99" },
      "Widget",
      1001,
    );
    expect(result).not.toBeNull();
    expect(result!.changeType).toBe(ChangeType.priceDropped);
    expect(result!.oldValue).toBe("29.99");
    expect(result!.newValue).toBe("19.99");
    expect(result!.priceChange).toBe("-10.00");
    expect(result!.productShopifyId).toBe(1001);
  });

  test("price increase", () => {
    const result = detectPriceChanges(
      baseVariant,
      { ...baseFetched, price: "39.99" },
      "Widget",
      1001,
    );
    expect(result).not.toBeNull();
    expect(result!.changeType).toBe(ChangeType.priceIncreased);
    expect(result!.priceChange).toBe("10.00");
  });

  test("no change returns null", () => {
    const result = detectPriceChanges(baseVariant, baseFetched, "Widget", 1001);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectStockChanges
// ---------------------------------------------------------------------------

describe("detectStockChanges", () => {
  const baseVariant = {
    id: 1,
    title: "Default",
    price: "29.99",
    compareAtPrice: null,
    available: false,
  };

  const baseFetched = {
    id: 100,
    title: "Default",
    sku: null,
    price: "29.99",
    compare_at_price: null,
    available: false,
    position: 1,
  };

  test("back in stock", () => {
    const result = detectStockChanges(
      baseVariant,
      { ...baseFetched, available: true },
      "Widget",
      1001,
    );
    expect(result).not.toBeNull();
    expect(result!.changeType).toBe(ChangeType.backInStock);
    expect(result!.newValue).toBe("in_stock");
  });

  test("out of stock", () => {
    const result = detectStockChanges(
      { ...baseVariant, available: true },
      baseFetched,
      "Widget",
      1001,
    );
    expect(result).not.toBeNull();
    expect(result!.changeType).toBe(ChangeType.outOfStock);
    expect(result!.newValue).toBe("out_of_stock");
  });

  test("no change returns null", () => {
    const result = detectStockChanges(
      baseVariant,
      baseFetched,
      "Widget",
      1001,
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectImageChanges
// ---------------------------------------------------------------------------

describe("detectImageChanges", () => {
  const existing = {
    id: 1,
    title: "Widget",
    images: [
      { id: 1, url: "https://cdn.shopify.com/a.jpg" },
      { id: 2, url: "https://cdn.shopify.com/b.jpg" },
    ],
  };

  const baseFetched = {
    id: 1001,
    title: "Widget",
    handle: "widget",
    vendor: null,
    product_type: null,
    created_at: null,
    published_at: null,
    updated_at: null,
    images: [
      { src: "https://cdn.shopify.com/a.jpg" },
      { src: "https://cdn.shopify.com/b.jpg" },
    ],
    variants: [],
  };

  test("images added", () => {
    const fetched = {
      ...baseFetched,
      images: [
        ...baseFetched.images,
        { src: "https://cdn.shopify.com/c.jpg" },
      ],
    };
    const result = detectImageChanges(existing, fetched);
    expect(result).not.toBeNull();
    expect(result!.changeType).toBe(ChangeType.imagesChanged);
    expect(result!.newValue).toBe("https://cdn.shopify.com/c.jpg");
    expect(result!.oldValue).toBeNull();
  });

  test("images removed", () => {
    const fetched = {
      ...baseFetched,
      images: [{ src: "https://cdn.shopify.com/a.jpg" }],
    };
    const result = detectImageChanges(existing, fetched);
    expect(result).not.toBeNull();
    expect(result!.oldValue).toBe("https://cdn.shopify.com/b.jpg");
    expect(result!.newValue).toBeNull();
  });

  test("images added and removed", () => {
    const fetched = {
      ...baseFetched,
      images: [
        { src: "https://cdn.shopify.com/a.jpg" },
        { src: "https://cdn.shopify.com/c.jpg" },
      ],
    };
    const result = detectImageChanges(existing, fetched);
    expect(result).not.toBeNull();
    expect(result!.oldValue).toBe("https://cdn.shopify.com/b.jpg");
    expect(result!.newValue).toBe("https://cdn.shopify.com/c.jpg");
  });

  test("no change returns null", () => {
    const result = detectImageChanges(existing, baseFetched);
    expect(result).toBeNull();
  });
});
