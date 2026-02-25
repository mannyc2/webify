import { describe, expect, test } from "bun:test";
import { computeSyncDiff, type ExistingProductState } from "../../diff";
import type { ShopifyProduct } from "../../clients/shopify";
import { ChangeType } from "@webify/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExisting(id: number, overrides?: Partial<ExistingProductState>): ExistingProductState {
  return {
    id,
    title: `Product ${id}`,
    isRemoved: false,
    variants: [{ id: id * 10, price: "29.99", compareAtPrice: null, available: true, title: "Default" }],
    images: [{ id: id * 100, url: `https://cdn.shopify.com/${id}.jpg`, isRemoved: false }],
    ...overrides,
  };
}

function makeFetched(id: number, overrides?: Partial<ShopifyProduct>): ShopifyProduct {
  return {
    id,
    title: `Product ${id}`,
    handle: `product-${id}`,
    vendor: "TestVendor",
    product_type: "Widget",
    created_at: "2025-01-01T00:00:00Z",
    published_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    images: [{ src: `https://cdn.shopify.com/${id}.jpg` }],
    variants: [{ id: id * 10, title: "Default", sku: null, price: "29.99", compare_at_price: null, available: true, position: 1 }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeSyncDiff
// ---------------------------------------------------------------------------

describe("computeSyncDiff", () => {
  test("new product is in newProducts and changes", () => {
    const existing: ExistingProductState[] = [];
    const fetched: ShopifyProduct[] = [makeFetched(1)];

    const diff = computeSyncDiff(existing, fetched);
    expect(diff.newProducts).toHaveLength(1);
    expect(diff.newProducts[0].id).toBe(1);
    expect(diff.changes.some(c => c.changeType === ChangeType.newProduct)).toBe(true);
  });

  test("removed product is in removedProductIds and changes", () => {
    const existing: ExistingProductState[] = [makeExisting(1)];
    const fetched: ShopifyProduct[] = [];

    const diff = computeSyncDiff(existing, fetched);
    expect(diff.removedProductIds).toHaveLength(1);
    expect(diff.removedProductIds[0].id).toBe(1);
    expect(diff.removedProductIds[0].title).toBe("Product 1");
    expect(diff.changes.some(c => c.changeType === ChangeType.productRemoved)).toBe(true);
  });

  test("restored (previously removed) product is in restoredProductIds", () => {
    const existing: ExistingProductState[] = [makeExisting(1, { isRemoved: true })];
    const fetched: ShopifyProduct[] = [makeFetched(1)];

    const diff = computeSyncDiff(existing, fetched);
    expect(diff.restoredProductIds).toContain(1);
  });

  test("price change is in variantChanges with priceChange and needsSnapshot=true", () => {
    const existing: ExistingProductState[] = [makeExisting(1)];
    const fetched: ShopifyProduct[] = [
      makeFetched(1, {
        variants: [{ id: 10, title: "Default", sku: null, price: "19.99", compare_at_price: null, available: true, position: 1 }],
      }),
    ];

    const diff = computeSyncDiff(existing, fetched);
    expect(diff.variantChanges).toHaveLength(1);
    expect(diff.variantChanges[0].priceChange).not.toBeNull();
    expect(diff.variantChanges[0].priceChange!.changeType).toBe(ChangeType.priceDropped);
    expect(diff.variantChanges[0].needsSnapshot).toBe(true);
    expect(diff.variantChanges[0].existingPrice).toBe("29.99");
    expect(diff.variantChanges[0].existingCompareAtPrice).toBeNull();
    expect(diff.variantChanges[0].existingAvailable).toBe(true);
    expect(diff.changes.some(c => c.changeType === ChangeType.priceDropped)).toBe(true);
  });

  test("stock change is in variantChanges with stockChange and needsSnapshot=true", () => {
    const existing: ExistingProductState[] = [makeExisting(1)];
    const fetched: ShopifyProduct[] = [
      makeFetched(1, {
        variants: [{ id: 10, title: "Default", sku: null, price: "29.99", compare_at_price: null, available: false, position: 1 }],
      }),
    ];

    const diff = computeSyncDiff(existing, fetched);
    expect(diff.variantChanges).toHaveLength(1);
    expect(diff.variantChanges[0].stockChange).not.toBeNull();
    expect(diff.variantChanges[0].stockChange!.changeType).toBe(ChangeType.outOfStock);
    expect(diff.variantChanges[0].needsSnapshot).toBe(true);
    expect(diff.changes.some(c => c.changeType === ChangeType.outOfStock)).toBe(true);
  });

  test("no changes: empty changes, variants have needsSnapshot=false", () => {
    const existing: ExistingProductState[] = [makeExisting(1)];
    const fetched: ShopifyProduct[] = [makeFetched(1)];

    const diff = computeSyncDiff(existing, fetched);
    expect(diff.changes).toHaveLength(0);
    expect(diff.newProducts).toHaveLength(0);
    expect(diff.removedProductIds).toHaveLength(0);
    expect(diff.restoredProductIds).toHaveLength(0);
    expect(diff.variantChanges).toHaveLength(1);
    expect(diff.variantChanges[0].needsSnapshot).toBe(false);
    expect(diff.variantChanges[0].priceChange).toBeNull();
    expect(diff.variantChanges[0].stockChange).toBeNull();
    expect(diff.variantChanges[0].existingPrice).toBe("29.99");
    expect(diff.variantChanges[0].existingCompareAtPrice).toBeNull();
    expect(diff.variantChanges[0].existingAvailable).toBe(true);
  });

  test("image changes are in imageChanges and changes", () => {
    const existing: ExistingProductState[] = [makeExisting(1)];
    const fetched: ShopifyProduct[] = [
      makeFetched(1, {
        images: [{ src: "https://cdn.shopify.com/new.jpg" }],
      }),
    ];

    const diff = computeSyncDiff(existing, fetched);
    expect(diff.imageChanges).toHaveLength(1);
    expect(diff.imageChanges[0].changeType).toBe(ChangeType.imagesChanged);
    expect(diff.changes.some(c => c.changeType === ChangeType.imagesChanged)).toBe(true);
  });

  test("mix of new, removed, and updated products", () => {
    const existing: ExistingProductState[] = [
      makeExisting(1), // will be updated (price change)
      makeExisting(2), // will be removed
    ];
    const fetched: ShopifyProduct[] = [
      makeFetched(1, {
        variants: [{ id: 10, title: "Default", sku: null, price: "39.99", compare_at_price: null, available: true, position: 1 }],
      }),
      makeFetched(3), // new product
    ];

    const diff = computeSyncDiff(existing, fetched);

    // New product
    expect(diff.newProducts).toHaveLength(1);
    expect(diff.newProducts[0].id).toBe(3);

    // Removed product
    expect(diff.removedProductIds).toHaveLength(1);
    expect(diff.removedProductIds[0].id).toBe(2);

    // Variant change for product 1
    expect(diff.variantChanges).toHaveLength(1);
    expect(diff.variantChanges[0].priceChange).not.toBeNull();
    expect(diff.variantChanges[0].priceChange!.changeType).toBe(ChangeType.priceIncreased);

    // Changes array has all events
    expect(diff.changes.length).toBeGreaterThanOrEqual(3);
    const changeTypes = diff.changes.map(c => c.changeType);
    expect(changeTypes).toContain(ChangeType.newProduct);
    expect(changeTypes).toContain(ChangeType.productRemoved);
    expect(changeTypes).toContain(ChangeType.priceIncreased);
  });
});
