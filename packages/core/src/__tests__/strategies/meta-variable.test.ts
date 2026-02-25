import { describe, expect, test } from "bun:test";
import { tryMetaVariable } from "../../parsing/strategies/meta-variable";
import type { ScriptTag } from "../../parsing/types";

function makeScript(content: string): ScriptTag {
  return { type: null, dataAttrs: {}, content };
}

describe("tryMetaVariable", () => {
  test("var meta = { product: { title: '...' } } extracts product", () => {
    const scripts: ScriptTag[] = [
      makeScript(
        `var meta = ${JSON.stringify({
          product: {
            title: "Meta Widget",
            handle: "meta-widget",
            vendor: "MetaCo",
            variants: [{ id: 1, title: "Default", price: "39.99", available: true }],
            images: [],
            media: [],
          },
        })};`,
      ),
    ];
    const result = tryMetaVariable(scripts);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("meta-variable");
    expect(result!.product.title).toBe("Meta Widget");
    expect(result!.product.vendor).toBe("MetaCo");
  });

  test("product with variants is normalized", () => {
    const scripts: ScriptTag[] = [
      makeScript(
        `var meta = ${JSON.stringify({
          product: {
            title: "Multi Variant",
            variants: [
              { id: 1, title: "Small", price: "19.99", available: true, sku: "SM" },
              { id: 2, title: "Large", price: "29.99", available: false, sku: "LG" },
            ],
            images: [],
            media: [],
          },
        })};`,
      ),
    ];
    const result = tryMetaVariable(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.variants).toHaveLength(2);
    expect(result!.product.variants[0].title).toBe("Small");
    expect(result!.product.variants[1].available).toBe(false);
  });

  test("no 'var meta' in scripts returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript("var config = { debug: true };"),
      makeScript("console.log('hello');"),
    ];
    expect(tryMetaVariable(scripts)).toBeNull();
  });

  test("var meta found but no valid JSON returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript("var meta = {broken json here"),
    ];
    expect(tryMetaVariable(scripts)).toBeNull();
  });

  test("var meta found but no product key returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript(
        `var meta = ${JSON.stringify({ page: { title: "About" } })};`,
      ),
    ];
    expect(tryMetaVariable(scripts)).toBeNull();
  });
});
