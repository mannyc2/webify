import { describe, expect, test } from "bun:test";
import { ChangeType, ChangeMagnitude } from "@webify/db";
import type { SyncDiff } from "@webify/core/diff";
import type { ShopifyProduct } from "@webify/core/clients/shopify";
import { syncDiffToWriteOps, type ExistingProductInfo } from "../../sync/writes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeShopifyProduct(id: number, overrides?: Partial<ShopifyProduct>): ShopifyProduct {
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

const NOW = "2025-06-15T12:00:00.000Z";
const DOMAIN = "test-store.myshopify.com";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("syncDiffToWriteOps", () => {
  test("new product → newProducts has correct fields, variants, and images", () => {
    const shopify = makeShopifyProduct(1);
    const diff: SyncDiff = {
      newProducts: [shopify],
      removedProductIds: [],
      restoredProductIds: [],
      variantChanges: [],
      imageChanges: [],
      updatedProducts: [],
      changes: [{
        changeType: ChangeType.newProduct,
        magnitude: ChangeMagnitude.medium,
        productTitle: shopify.title,
        variantTitle: null,
        oldValue: null,
        newValue: null,
        priceChange: null,
        productShopifyId: shopify.id,
      }],
    };

    const ops = syncDiffToWriteOps(diff, new Map(), DOMAIN, NOW);

    expect(ops.newProducts).toHaveLength(1);
    const np = ops.newProducts[0];
    expect(np.product.id).toBe(1);
    expect(np.product.storeDomain).toBe(DOMAIN);
    expect(np.product.handle).toBe("product-1");
    expect(np.product.title).toBe("Product 1");
    expect(np.product.cachedPrice).toBe("29.99");
    expect(np.product.cachedIsAvailable).toBe(true);
    expect(np.product.firstSeenAt).toBe(NOW);
    expect(np.product.isRemoved).toBe(false);
    expect(np.variants).toHaveLength(1);
    expect(np.variants[0].id).toBe(10);
    expect(np.variants[0].productId).toBe(1);
    expect(np.variants[0].price).toBe("29.99");
    expect(np.images).toHaveLength(1);
    expect(np.images[0].productId).toBe(1);
    expect(np.images[0].url).toBe("https://cdn.shopify.com/1.jpg");
  });

  test("removed product → removeIds contains the product id", () => {
    const diff: SyncDiff = {
      newProducts: [],
      removedProductIds: [{ id: 42, title: "Gone Product" }],
      restoredProductIds: [],
      variantChanges: [],
      imageChanges: [],
      updatedProducts: [],
      changes: [{
        changeType: ChangeType.productRemoved,
        magnitude: ChangeMagnitude.medium,
        productTitle: "Gone Product",
        variantTitle: null,
        oldValue: null,
        newValue: null,
        priceChange: null,
        productShopifyId: null,
      }],
    };

    const ops = syncDiffToWriteOps(diff, new Map(), DOMAIN, NOW);
    expect(ops.removeIds).toEqual([42]);
  });

  test("restored product → restoreIds contains the product id", () => {
    const diff: SyncDiff = {
      newProducts: [],
      removedProductIds: [],
      restoredProductIds: [7],
      variantChanges: [],
      imageChanges: [],
      updatedProducts: [{ productId: 7, shopify: makeShopifyProduct(7) }],
      changes: [],
    };

    const existing = new Map<number, ExistingProductInfo>([[7, {
      id: 7,
      variants: [{ id: 70, price: "29.99", compareAtPrice: null, available: true, title: "Default", sku: null, position: 1 }],
      images: [{ id: 700, url: "https://cdn.shopify.com/7.jpg", isRemoved: true }],
    }]]);

    const ops = syncDiffToWriteOps(diff, existing, DOMAIN, NOW);
    expect(ops.restoreIds).toContain(7);
  });

  test("variant with needsSnapshot → snapshots entry uses existing state", () => {
    const diff: SyncDiff = {
      newProducts: [],
      removedProductIds: [],
      restoredProductIds: [],
      variantChanges: [{
        variantId: 10,
        fetchedVariant: { id: 10, title: "Default", sku: null, price: "19.99", compare_at_price: null, available: true, position: 1 },
        existingPrice: "29.99",
        existingCompareAtPrice: "39.99",
        existingAvailable: true,
        priceChange: {
          changeType: ChangeType.priceDropped,
          magnitude: ChangeMagnitude.large,
          productTitle: "Product 1",
          variantTitle: "Default",
          oldValue: "29.99",
          newValue: "19.99",
          priceChange: "-10.00",
          productShopifyId: 1,
        },
        stockChange: null,
        needsSnapshot: true,
      }],
      imageChanges: [],
      updatedProducts: [{ productId: 1, shopify: makeShopifyProduct(1, {
        variants: [{ id: 10, title: "Default", sku: null, price: "19.99", compare_at_price: null, available: true, position: 1 }],
      }) }],
      changes: [{
        changeType: ChangeType.priceDropped,
        magnitude: ChangeMagnitude.large,
        productTitle: "Product 1",
        variantTitle: "Default",
        oldValue: "29.99",
        newValue: "19.99",
        priceChange: "-10.00",
        productShopifyId: 1,
      }],
    };

    const existing = new Map<number, ExistingProductInfo>([[1, {
      id: 1,
      variants: [{ id: 10, price: "29.99", compareAtPrice: "39.99", available: true, title: "Default", sku: null, position: 1 }],
      images: [{ id: 100, url: "https://cdn.shopify.com/1.jpg", isRemoved: false }],
    }]]);

    const ops = syncDiffToWriteOps(diff, existing, DOMAIN, NOW);
    expect(ops.snapshots).toHaveLength(1);
    expect(ops.snapshots[0].variantId).toBe(10);
    expect(ops.snapshots[0].price).toBe("29.99");
    expect(ops.snapshots[0].compareAtPrice).toBe("39.99");
    expect(ops.snapshots[0].available).toBe(true);
    expect(ops.snapshots[0].capturedAt).toBe(NOW);
  });

  test("change events have UUIDs and correct fields", () => {
    const diff: SyncDiff = {
      newProducts: [makeShopifyProduct(1)],
      removedProductIds: [],
      restoredProductIds: [],
      variantChanges: [],
      imageChanges: [],
      updatedProducts: [],
      changes: [{
        changeType: ChangeType.newProduct,
        magnitude: ChangeMagnitude.medium,
        productTitle: "Product 1",
        variantTitle: null,
        oldValue: null,
        newValue: null,
        priceChange: null,
        productShopifyId: 1,
      }],
    };

    const ops = syncDiffToWriteOps(diff, new Map(), DOMAIN, NOW);
    expect(ops.changeEvents).toHaveLength(1);
    expect(ops.changeEvents[0].id).toBeTruthy();
    expect(ops.changeEvents[0].id.length).toBe(36); // UUID format
    expect(ops.changeEvents[0].storeDomain).toBe(DOMAIN);
    expect(ops.changeEvents[0].occurredAt).toBe(NOW);
    expect(ops.changeEvents[0].changeType).toBe(ChangeType.newProduct);
    expect(ops.changeEvents[0].isRead).toBe(false);
  });

  test("store metadata has correct domain, timestamp, and product count", () => {
    const diff: SyncDiff = {
      newProducts: [makeShopifyProduct(1)],
      removedProductIds: [],
      restoredProductIds: [],
      variantChanges: [],
      imageChanges: [],
      updatedProducts: [{ productId: 2, shopify: makeShopifyProduct(2) }],
      changes: [],
    };

    const existing = new Map<number, ExistingProductInfo>([[2, {
      id: 2,
      variants: [{ id: 20, price: "29.99", compareAtPrice: null, available: true, title: "Default", sku: null, position: 1 }],
      images: [],
    }]]);

    const ops = syncDiffToWriteOps(diff, existing, DOMAIN, NOW);
    expect(ops.storeUpdate.domain).toBe(DOMAIN);
    expect(ops.storeUpdate.lastFetchedAt).toBe(NOW);
    expect(ops.storeUpdate.syncStatus).toBe("healthy");
    expect(ops.storeUpdate.lastError).toBeNull();
    // cachedProductCount = newProducts.length + updatedProducts.length
    expect(ops.storeUpdate.cachedProductCount).toBe(2);
  });

  test("mixed diff produces correct array lengths", () => {
    const diff: SyncDiff = {
      newProducts: [makeShopifyProduct(3)],
      removedProductIds: [{ id: 2, title: "Old Product" }],
      restoredProductIds: [1],
      variantChanges: [
        {
          variantId: 10,
          fetchedVariant: { id: 10, title: "Default", sku: null, price: "19.99", compare_at_price: null, available: true, position: 1 },
          existingPrice: "29.99",
          existingCompareAtPrice: null,
          existingAvailable: true,
          priceChange: {
            changeType: ChangeType.priceDropped,
            magnitude: ChangeMagnitude.large,
            productTitle: "Product 1",
            variantTitle: "Default",
            oldValue: "29.99",
            newValue: "19.99",
            priceChange: "-10.00",
            productShopifyId: 1,
          },
          stockChange: null,
          needsSnapshot: true,
        },
      ],
      imageChanges: [],
      updatedProducts: [{ productId: 1, shopify: makeShopifyProduct(1, {
        variants: [{ id: 10, title: "Default", sku: null, price: "19.99", compare_at_price: null, available: true, position: 1 }],
      }) }],
      changes: [
        { changeType: ChangeType.newProduct, magnitude: ChangeMagnitude.medium, productTitle: "Product 3", variantTitle: null, oldValue: null, newValue: null, priceChange: null, productShopifyId: 3 },
        { changeType: ChangeType.productRemoved, magnitude: ChangeMagnitude.medium, productTitle: "Old Product", variantTitle: null, oldValue: null, newValue: null, priceChange: null, productShopifyId: null },
        { changeType: ChangeType.priceDropped, magnitude: ChangeMagnitude.large, productTitle: "Product 1", variantTitle: "Default", oldValue: "29.99", newValue: "19.99", priceChange: "-10.00", productShopifyId: 1 },
      ],
    };

    const existing = new Map<number, ExistingProductInfo>([[1, {
      id: 1,
      variants: [{ id: 10, price: "29.99", compareAtPrice: null, available: true, title: "Default", sku: null, position: 1 }],
      images: [{ id: 100, url: "https://cdn.shopify.com/1.jpg", isRemoved: false }],
    }]]);

    const ops = syncDiffToWriteOps(diff, existing, DOMAIN, NOW);

    expect(ops.newProducts).toHaveLength(1);
    expect(ops.removeIds).toHaveLength(1);
    expect(ops.restoreIds).toHaveLength(1);
    expect(ops.snapshots).toHaveLength(1);
    expect(ops.productUpdates).toHaveLength(1);
    expect(ops.variantUpserts).toHaveLength(1);
    expect(ops.changeEvents).toHaveLength(3);
    expect(ops.imageUpserts).toHaveLength(1); // existing image gets updated
  });

  test("variant upsert types: insert for new, update for existing", () => {
    const shopify = makeShopifyProduct(1, {
      variants: [
        { id: 10, title: "Default", sku: null, price: "29.99", compare_at_price: null, available: true, position: 1 },
        { id: 99, title: "New Variant", sku: "NEW", price: "39.99", compare_at_price: null, available: true, position: 2 },
      ],
    });

    const diff: SyncDiff = {
      newProducts: [],
      removedProductIds: [],
      restoredProductIds: [],
      variantChanges: [],
      imageChanges: [],
      updatedProducts: [{ productId: 1, shopify }],
      changes: [],
    };

    const existing = new Map<number, ExistingProductInfo>([[1, {
      id: 1,
      variants: [{ id: 10, price: "29.99", compareAtPrice: null, available: true, title: "Default", sku: null, position: 1 }],
      images: [],
    }]]);

    const ops = syncDiffToWriteOps(diff, existing, DOMAIN, NOW);
    expect(ops.variantUpserts).toHaveLength(2);
    const update = ops.variantUpserts.find(v => v.type === "update");
    const insert = ops.variantUpserts.find(v => v.type === "insert");
    expect(update?.id).toBe(10);
    expect(insert?.id).toBe(99);
  });

  test("image soft-deletes for removed images", () => {
    const shopify = makeShopifyProduct(1, {
      images: [{ src: "https://cdn.shopify.com/new.jpg" }],
    });

    const diff: SyncDiff = {
      newProducts: [],
      removedProductIds: [],
      restoredProductIds: [],
      variantChanges: [],
      imageChanges: [],
      updatedProducts: [{ productId: 1, shopify }],
      changes: [],
    };

    const existing = new Map<number, ExistingProductInfo>([[1, {
      id: 1,
      variants: [{ id: 10, price: "29.99", compareAtPrice: null, available: true, title: "Default", sku: null, position: 1 }],
      images: [{ id: 100, url: "https://cdn.shopify.com/old.jpg", isRemoved: false }],
    }]]);

    const ops = syncDiffToWriteOps(diff, existing, DOMAIN, NOW);
    expect(ops.imageSoftDeletes).toHaveLength(1);
    expect(ops.imageSoftDeletes[0].id).toBe(100);
    expect(ops.imageSoftDeletes[0].removedAt).toBe(NOW);
    // New image should be an insert
    expect(ops.imageUpserts).toHaveLength(1);
    expect(ops.imageUpserts[0].type).toBe("insert");
  });
});
