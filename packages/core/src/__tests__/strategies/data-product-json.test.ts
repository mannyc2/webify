import { describe, expect, test } from "bun:test";
import { tryDataProductJson } from "../../parsing/strategies/data-product-json";
import type { ScriptTag } from "../../parsing/types";

function makeScript(overrides: Partial<ScriptTag> = {}): ScriptTag {
  return {
    type: null,
    dataAttrs: {},
    content: "",
    ...overrides,
  };
}

describe("tryDataProductJson", () => {
  test("script with data-product-json attribute + valid JSON", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        type: "application/json",
        dataAttrs: { "data-product-json": "" },
        content: JSON.stringify({
          title: "Widget",
          handle: "widget",
          vendor: "TestCo",
          product_type: "Gadget",
          variants: [{ id: 1, title: "Default", price: "29.99", available: true }],
          images: [{ src: "https://cdn.shopify.com/widget.jpg" }],
          media: [],
        }),
      }),
    ];
    const result = tryDataProductJson(scripts);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("data-product-json");
    expect(result!.product.title).toBe("Widget");
    expect(result!.product.vendor).toBe("TestCo");
  });

  test("script with id containing 'product-json'", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        dataAttrs: { id: "shopify-product-json" },
        type: "application/json",
        content: JSON.stringify({
          title: "ID Widget",
          handle: "id-widget",
          variants: [],
        }),
      }),
    ];
    const result = tryDataProductJson(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("ID Widget");
  });

  test("script with type application/json + product data", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        type: "application/json",
        content: JSON.stringify({
          title: "JSON Widget",
          variants: [{ id: 1, price: "9.99", available: true }],
        }),
      }),
    ];
    const result = tryDataProductJson(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("JSON Widget");
  });

  test("product wrapped in { product: ... } is unwrapped", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        type: "application/json",
        dataAttrs: { "data-product-json": "" },
        content: JSON.stringify({
          product: {
            title: "Wrapped Widget",
            handle: "wrapped",
            variants: [],
          },
        }),
      }),
    ];
    const result = tryDataProductJson(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Wrapped Widget");
  });

  test("no matching scripts returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        type: "text/javascript",
        content: "console.log('hello');",
      }),
    ];
    expect(tryDataProductJson(scripts)).toBeNull();
  });

  test("empty script content returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        type: "application/json",
        dataAttrs: { "data-product-json": "" },
        content: "",
      }),
    ];
    expect(tryDataProductJson(scripts)).toBeNull();
  });

  test("invalid JSON returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        type: "application/json",
        dataAttrs: { "data-product-json": "" },
        content: "{broken json",
      }),
    ];
    expect(tryDataProductJson(scripts)).toBeNull();
  });

  test("valid JSON but not a product (no title/variants/handle) returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript({
        type: "application/json",
        dataAttrs: { "data-product-json": "" },
        content: JSON.stringify({ settings: { theme: "dark" } }),
      }),
    ];
    expect(tryDataProductJson(scripts)).toBeNull();
  });
});
