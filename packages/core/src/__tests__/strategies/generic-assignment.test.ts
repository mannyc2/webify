import { describe, expect, test } from "bun:test";
import { tryGenericAssignment } from "../../parsing/strategies/generic-assignment";
import type { ScriptTag } from "../../parsing/types";

function makeScript(content: string): ScriptTag {
  return { type: null, dataAttrs: {}, content };
}

describe("tryGenericAssignment", () => {
  test("ShopifyAnalytics.meta.product = { id, title, ... }", () => {
    const scripts: ScriptTag[] = [
      makeScript(
        `ShopifyAnalytics.meta.product = ${JSON.stringify({
          id: 123,
          title: "Analytics Widget",
          vendor: "AnalyticsCo",
          type: "Gadget",
          variants: [{ id: 1, title: "Default", price: "49.99", available: true }],
        })};`,
      ),
    ];
    const result = tryGenericAssignment(scripts);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("generic-assignment");
    expect(result!.product.title).toBe("Analytics Widget");
    expect(result!.product.vendor).toBe("AnalyticsCo");
  });

  test("ShopifyAnalytics.meta = { product: { ... } }", () => {
    const scripts: ScriptTag[] = [
      makeScript(
        `ShopifyAnalytics.meta = ${JSON.stringify({
          product: {
            title: "Meta Product",
            vendor: "MetaCo",
            variants: [{ id: 1, price: "29.99", available: true }],
          },
        })};`,
      ),
    ];
    const result = tryGenericAssignment(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Meta Product");
  });

  test("GID regex extraction with price constructs product", () => {
    const scripts: ScriptTag[] = [
      makeScript(
        `ShopifyAnalytics.meta = {};
         ShopifyAnalytics.meta.product = {};
         gid: "gid://shopify/Product/12345",
         vendor: "GidVendor",
         type: "Electronics",
         product_title: "GID Widget",
         price: "39.99"`,
      ),
    ];
    // The direct pattern will match empty object first, but that has no id/gid/title
    // Then the meta pattern matches empty meta, which has no product key
    // Then the GID regex fallback kicks in
    const result = tryGenericAssignment(scripts);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("generic-assignment");
    expect(result!.product.title).toBe("GID Widget");
    expect(result!.product.vendor).toBe("GidVendor");
    expect(result!.product.productType).toBe("Electronics");
    expect(result!.product.variants).toHaveLength(1);
    expect(result!.product.variants[0].price).toBe("39.99");
  });

  test("no ShopifyAnalytics returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript("var config = { debug: true };"),
      makeScript("console.log('hello');"),
    ];
    expect(tryGenericAssignment(scripts)).toBeNull();
  });

  test("ShopifyAnalytics present but no extractable data returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript("ShopifyAnalytics.lib.track('page_view');"),
    ];
    expect(tryGenericAssignment(scripts)).toBeNull();
  });
});
