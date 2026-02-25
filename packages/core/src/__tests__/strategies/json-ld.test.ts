import { describe, expect, test } from "bun:test";
import { tryJsonLd } from "../../parsing/strategies/json-ld";
import type { ScriptTag } from "../../parsing/types";

function makeLdScript(data: any): ScriptTag {
  return {
    type: "application/ld+json",
    dataAttrs: {},
    content: JSON.stringify(data),
  };
}

describe("tryJsonLd", () => {
  test("@type: Product extracts product", () => {
    const scripts: ScriptTag[] = [
      makeLdScript({
        "@type": "Product",
        name: "LD Widget",
        brand: { name: "LDCo" },
        category: "Gadget",
        image: "https://cdn.shopify.com/ld.jpg",
        offers: {
          price: "59.99",
          availability: "https://schema.org/InStock",
          sku: "LD-001",
        },
      }),
    ];
    const result = tryJsonLd(scripts);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("json-ld");
    expect(result!.product.title).toBe("LD Widget");
    expect(result!.product.vendor).toBe("LDCo");
    expect(result!.product.productType).toBe("Gadget");
    expect(result!.product.images).toEqual(["https://cdn.shopify.com/ld.jpg"]);
    expect(result!.product.variants).toHaveLength(1);
    expect(result!.product.variants[0].price).toBe("59.99");
    expect(result!.product.variants[0].available).toBe(true);
    expect(result!.product.variants[0].sku).toBe("LD-001");
  });

  test("Product in @graph array", () => {
    const scripts: ScriptTag[] = [
      makeLdScript({
        "@graph": [
          { "@type": "Organization", name: "Org" },
          {
            "@type": "Product",
            name: "Graph Widget",
            offers: { price: "19.99", availability: "InStock" },
          },
        ],
      }),
    ];
    const result = tryJsonLd(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Graph Widget");
  });

  test("JSON-LD array (multiple items) uses first Product", () => {
    const scripts: ScriptTag[] = [
      {
        type: "application/ld+json",
        dataAttrs: {},
        content: JSON.stringify([
          { "@type": "Organization", name: "Org" },
          { "@type": "Product", name: "First Product", offers: { price: "10.00" } },
          { "@type": "Product", name: "Second Product", offers: { price: "20.00" } },
        ]),
      },
    ];
    const result = tryJsonLd(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("First Product");
  });

  test("ProductGroup type", () => {
    const scripts: ScriptTag[] = [
      makeLdScript({
        "@type": "ProductGroup",
        name: "Group Widget",
        offers: [
          { price: "10.00", availability: "https://schema.org/InStock" },
          { price: "15.00", availability: "https://schema.org/OutOfStock" },
        ],
      }),
    ];
    const result = tryJsonLd(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Group Widget");
    expect(result!.product.variants).toHaveLength(2);
    expect(result!.product.variants[0].available).toBe(true);
    expect(result!.product.variants[1].available).toBe(false);
  });

  test("non-Product @type returns null", () => {
    const scripts: ScriptTag[] = [
      makeLdScript({ "@type": "Organization", name: "Org" }),
    ];
    expect(tryJsonLd(scripts)).toBeNull();
  });

  test("known gaps: always returns videos: [], variant IDs are null", () => {
    const scripts: ScriptTag[] = [
      makeLdScript({
        "@type": "Product",
        name: "Gap Widget",
        offers: { price: "10.00", availability: "InStock" },
      }),
    ];
    const result = tryJsonLd(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.videos).toEqual([]);
    expect(result!.product.variants[0].id).toBeNull();
  });

  test("empty content returns null", () => {
    const scripts: ScriptTag[] = [
      { type: "application/ld+json", dataAttrs: {}, content: "" },
    ];
    expect(tryJsonLd(scripts)).toBeNull();
  });

  test("whitespace-only content returns null", () => {
    const scripts: ScriptTag[] = [
      { type: "application/ld+json", dataAttrs: {}, content: "   " },
    ];
    expect(tryJsonLd(scripts)).toBeNull();
  });
});
