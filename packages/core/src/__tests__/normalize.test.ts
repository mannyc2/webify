import { describe, expect, test } from "bun:test";
import {
  normalizePrice,
  normalizeShopifyProduct,
  normalizeJsonLdProduct,
  findJsonLdProducts,
} from "../parsing/normalize";

// ---------------------------------------------------------------------------
// normalizePrice
// ---------------------------------------------------------------------------

describe("normalizePrice", () => {
  test("string price '29.99'", () => {
    expect(normalizePrice("29.99")).toBe("29.99");
  });

  test("string price with dollar sign '$29.99'", () => {
    expect(normalizePrice("$29.99")).toBe("29.99");
  });

  test("string price with euro and comma '€29,99'", () => {
    expect(normalizePrice("€29,99")).toBe("29,99");
  });

  test("string price '0'", () => {
    expect(normalizePrice("0")).toBe("0");
  });

  test("empty string returns '0.00'", () => {
    expect(normalizePrice("")).toBe("0.00");
  });

  test("non-numeric string 'abc' returns '0.00'", () => {
    expect(normalizePrice("abc")).toBe("0.00");
  });

  test("number 2999 (cents) returns '29.99'", () => {
    expect(normalizePrice(2999)).toBe("29.99");
  });

  test("number 29.99 (dollars) returns '29.99'", () => {
    expect(normalizePrice(29.99)).toBe("29.99");
  });

  test("number 0 returns '0.00'", () => {
    expect(normalizePrice(0)).toBe("0.00");
  });

  test("number 100 (cents) returns '1.00'", () => {
    expect(normalizePrice(100)).toBe("1.00");
  });

  test("number 99 (small integer < 100) returns '99.00'", () => {
    expect(normalizePrice(99)).toBe("99.00");
  });

  test("null returns '0.00'", () => {
    expect(normalizePrice(null)).toBe("0.00");
  });

  test("undefined returns '0.00'", () => {
    expect(normalizePrice(undefined)).toBe("0.00");
  });

  test("boolean returns '0.00'", () => {
    expect(normalizePrice(true)).toBe("0.00");
    expect(normalizePrice(false)).toBe("0.00");
  });
});

// ---------------------------------------------------------------------------
// normalizeShopifyProduct
// ---------------------------------------------------------------------------

describe("normalizeShopifyProduct", () => {
  test("valid product with all fields", () => {
    const raw = {
      title: "Cool Widget",
      vendor: "WidgetCo",
      product_type: "Gadget",
      variants: [
        {
          id: 1,
          title: "Small",
          price: "19.99",
          compare_at_price: "29.99",
          available: true,
          sku: "CW-S",
        },
      ],
      images: [{ src: "https://cdn.shopify.com/widget.jpg" }],
      media: [],
    };

    const result = normalizeShopifyProduct(raw);
    expect(result.title).toBe("Cool Widget");
    expect(result.vendor).toBe("WidgetCo");
    expect(result.productType).toBe("Gadget");
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].id).toBe(1);
    expect(result.variants[0].title).toBe("Small");
    expect(result.variants[0].price).toBe("19.99");
    expect(result.variants[0].compareAtPrice).toBe("29.99");
    expect(result.variants[0].available).toBe(true);
    expect(result.variants[0].sku).toBe("CW-S");
    expect(result.images).toEqual(["https://cdn.shopify.com/widget.jpg"]);
    expect(result.videos).toEqual([]);
    expect(result.rawPrice).toBe("19.99");
  });

  test("product with missing optional fields uses defaults", () => {
    const raw = { title: "Bare Widget" };
    const result = normalizeShopifyProduct(raw);
    expect(result.title).toBe("Bare Widget");
    expect(result.vendor).toBeNull();
    expect(result.productType).toBeNull();
    expect(result.variants).toEqual([]);
    expect(result.images).toEqual([]);
    expect(result.videos).toEqual([]);
    expect(result.rawPrice).toBeNull();
  });

  test("product with invalid variants (skipped by Zod)", () => {
    const raw = {
      title: "Widget",
      variants: [
        { id: 1, title: "Good", price: "10.00", available: true },
        "not a variant",
        42,
        null,
      ],
    };
    const result = normalizeShopifyProduct(raw);
    // The valid variant should pass, invalid ones filtered
    expect(result.variants.length).toBeGreaterThanOrEqual(1);
    expect(result.variants[0].price).toBe("10.00");
  });

  test("empty/null input returns empty product", () => {
    const resultNull = normalizeShopifyProduct(null);
    expect(resultNull.title).toBeNull();
    expect(resultNull.variants).toEqual([]);

    const resultEmpty = normalizeShopifyProduct({});
    expect(resultEmpty.title).toBeNull();
    expect(resultEmpty.variants).toEqual([]);
  });

  test("product type priority: product_type > productType > type", () => {
    const withAll = {
      product_type: "First",
      productType: "Second",
      type: "Third",
    };
    expect(normalizeShopifyProduct(withAll).productType).toBe("First");

    const withoutFirst = { productType: "Second", type: "Third" };
    expect(normalizeShopifyProduct(withoutFirst).productType).toBe("Second");

    const withOnlyType = { type: "Third" };
    expect(normalizeShopifyProduct(withOnlyType).productType).toBe("Third");
  });

  test("images as string URLs", () => {
    const raw = {
      title: "Widget",
      images: ["https://cdn.shopify.com/a.jpg", "https://cdn.shopify.com/b.jpg"],
    };
    const result = normalizeShopifyProduct(raw);
    expect(result.images).toEqual([
      "https://cdn.shopify.com/a.jpg",
      "https://cdn.shopify.com/b.jpg",
    ]);
  });

  test("images as objects with url field", () => {
    const raw = {
      title: "Widget",
      images: [{ url: "https://cdn.shopify.com/a.jpg" }],
    };
    const result = normalizeShopifyProduct(raw);
    expect(result.images).toEqual(["https://cdn.shopify.com/a.jpg"]);
  });
});

// ---------------------------------------------------------------------------
// normalizeJsonLdProduct
// ---------------------------------------------------------------------------

describe("normalizeJsonLdProduct", () => {
  test("standard JSON-LD with offers", () => {
    const ld = {
      name: "LD Widget",
      brand: { name: "LDCo" },
      category: "Gadget",
      image: "https://cdn.shopify.com/ld.jpg",
      offers: {
        price: "59.99",
        availability: "https://schema.org/InStock",
        sku: "LD-001",
      },
    };
    const result = normalizeJsonLdProduct(ld);
    expect(result.title).toBe("LD Widget");
    expect(result.vendor).toBe("LDCo");
    expect(result.productType).toBe("Gadget");
    expect(result.images).toEqual(["https://cdn.shopify.com/ld.jpg"]);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].price).toBe("59.99");
    expect(result.variants[0].available).toBe(true);
    expect(result.variants[0].sku).toBe("LD-001");
    expect(result.videos).toEqual([]);
    expect(result.rawPrice).toBe("59.99");
  });

  test("brand as string", () => {
    const ld = { name: "Widget", brand: "BrandString" };
    const result = normalizeJsonLdProduct(ld);
    expect(result.vendor).toBe("BrandString");
  });

  test("brand as { name: string }", () => {
    const ld = { name: "Widget", brand: { name: "BrandObj" } };
    const result = normalizeJsonLdProduct(ld);
    expect(result.vendor).toBe("BrandObj");
  });

  test("InStock availability", () => {
    const ld = {
      name: "Widget",
      offers: { price: "10.00", availability: "https://schema.org/InStock" },
    };
    const result = normalizeJsonLdProduct(ld);
    expect(result.variants[0].available).toBe(true);
  });

  test("OutOfStock availability", () => {
    const ld = {
      name: "Widget",
      offers: { price: "10.00", availability: "https://schema.org/OutOfStock" },
    };
    const result = normalizeJsonLdProduct(ld);
    expect(result.variants[0].available).toBe(false);
  });

  test("image as string", () => {
    const ld = { name: "Widget", image: "https://example.com/img.jpg" };
    const result = normalizeJsonLdProduct(ld);
    expect(result.images).toEqual(["https://example.com/img.jpg"]);
  });

  test("image as array", () => {
    const ld = {
      name: "Widget",
      image: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    };
    const result = normalizeJsonLdProduct(ld);
    expect(result.images).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });

  test("variant IDs are always null (known gap)", () => {
    const ld = {
      name: "Widget",
      offers: [{ price: "10.00", availability: "InStock" }],
    };
    const result = normalizeJsonLdProduct(ld);
    expect(result.variants[0].id).toBeNull();
  });

  test("no offers returns empty variants", () => {
    const ld = { name: "Widget" };
    const result = normalizeJsonLdProduct(ld);
    expect(result.variants).toEqual([]);
    expect(result.rawPrice).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findJsonLdProducts
// ---------------------------------------------------------------------------

describe("findJsonLdProducts", () => {
  test("direct @type: Product", () => {
    const data = { "@type": "Product", name: "Widget" };
    const results = findJsonLdProducts(data);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Widget");
  });

  test("@type: ProductGroup", () => {
    const data = { "@type": "ProductGroup", name: "Group Widget" };
    const results = findJsonLdProducts(data);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Group Widget");
  });

  test("nested in @graph array", () => {
    const data = {
      "@graph": [
        { "@type": "Organization", name: "Org" },
        { "@type": "Product", name: "Graph Widget" },
      ],
    };
    const results = findJsonLdProducts(data);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Graph Widget");
  });

  test("no products found", () => {
    expect(findJsonLdProducts({ "@type": "Organization" })).toEqual([]);
    expect(findJsonLdProducts(null)).toEqual([]);
    expect(findJsonLdProducts("string")).toEqual([]);
    expect(findJsonLdProducts(42)).toEqual([]);
  });
});
