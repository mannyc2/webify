import { describe, expect, test } from "bun:test";
import { tryProductVariable } from "../../parsing/strategies/product-variable";
import type { ScriptTag } from "../../parsing/types";

function makeScript(content: string): ScriptTag {
  return { type: null, dataAttrs: {}, content };
}

const productJson = JSON.stringify({
  title: "Var Widget",
  handle: "var-widget",
  variants: [{ id: 1, title: "Default", price: "19.99", available: true }],
  images: [],
  media: [],
});

describe("tryProductVariable", () => {
  test("var product = { ... }", () => {
    const scripts: ScriptTag[] = [makeScript(`var product = ${productJson};`)];
    const result = tryProductVariable(scripts);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("product-variable");
    expect(result!.product.title).toBe("Var Widget");
  });

  test("let product = { ... }", () => {
    const scripts: ScriptTag[] = [makeScript(`let product = ${productJson};`)];
    const result = tryProductVariable(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Var Widget");
  });

  test("const product = { ... }", () => {
    const scripts: ScriptTag[] = [makeScript(`const product = ${productJson};`)];
    const result = tryProductVariable(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Var Widget");
  });

  test("obj.product = { ... }", () => {
    const scripts: ScriptTag[] = [makeScript(`window.product = ${productJson};`)];
    const result = tryProductVariable(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Var Widget");
  });

  test("product: { ... } (object literal property)", () => {
    const scripts: ScriptTag[] = [
      makeScript(`var config = { product: ${productJson} };`),
    ];
    const result = tryProductVariable(scripts);
    expect(result).not.toBeNull();
    expect(result!.product.title).toBe("Var Widget");
  });

  test("no matching pattern returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript("var items = [1, 2, 3];"),
      makeScript("console.log('no product here');"),
    ];
    expect(tryProductVariable(scripts)).toBeNull();
  });

  test("pattern found but invalid JSON returns null", () => {
    const scripts: ScriptTag[] = [
      makeScript("var product = {title: broken, not: json};"),
    ];
    expect(tryProductVariable(scripts)).toBeNull();
  });
});
