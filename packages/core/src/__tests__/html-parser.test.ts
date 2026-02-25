import { describe, expect, test } from "bun:test";
import { parseProductPage, hasMinimalData } from "../parsing/html-parser";
import type { ParseResult } from "../parsing/types";

// Read fixture files
const fixtureDir = new URL("./fixtures/", import.meta.url).pathname;

async function readFixture(name: string): Promise<string> {
  const file = Bun.file(`${fixtureDir}${name}`);
  return file.text();
}

// ---------------------------------------------------------------------------
// parseProductPage — integration tests (uses HTMLRewriter via Bun)
// ---------------------------------------------------------------------------

describe("parseProductPage", () => {
  test("HTML with data-product-json script", async () => {
    const html = await readFixture("data-product-json.html");
    const result = await parseProductPage(html);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("data-product-json");
    expect(result!.product.title).toBe("Fixture Widget");
    expect(result!.product.vendor).toBe("TestCo");
    expect(result!.product.productType).toBe("Gadget");
    expect(result!.product.variants).toHaveLength(1);
    expect(result!.product.variants[0].price).toBe("29.99");
    expect(result!.product.images).toEqual(["https://cdn.shopify.com/fixture.jpg"]);
  });

  test("HTML with var meta script", async () => {
    const html = await readFixture("meta-variable.html");
    const result = await parseProductPage(html);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("meta-variable");
    expect(result!.product.title).toBe("Meta Widget");
    expect(result!.product.vendor).toBe("MetaCo");
  });

  test("HTML with JSON-LD only", async () => {
    const html = await readFixture("json-ld.html");
    const result = await parseProductPage(html);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("json-ld");
    expect(result!.product.title).toBe("LD Widget");
    expect(result!.product.vendor).toBe("LDCo");
  });

  test("HTML with product variable", async () => {
    const html = await readFixture("product-variable.html");
    const result = await parseProductPage(html);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("product-variable");
    expect(result!.product.title).toBe("Var Widget");
  });

  test("HTML with generic assignment fixture (matched by product-variable first)", async () => {
    // The fixture uses `ShopifyAnalytics.meta.product = { ... }` which also
    // matches the product-variable strategy's `\w+\.product = {` pattern.
    // Since product-variable runs before generic-assignment, it wins.
    const html = await readFixture("generic-assignment.html");
    const result = await parseProductPage(html);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("product-variable");
    expect(result!.product.title).toBe("Analytics Widget");
  });

  test("HTML with pure generic-assignment (ShopifyAnalytics GID fallback)", async () => {
    // Use inline HTML that only matches the generic-assignment GID regex path.
    // No "var product", "let product", "const product", "x.product =", or
    // "product:" patterns that would trigger product-variable strategy.
    const html = `<!DOCTYPE html><html><head></head><body>
<script>
  ShopifyAnalytics.lib.track("page_view");
  ShopifyAnalytics.lib.setMeta({gid: "gid://shopify/Product/99999", vendor: "InlineVendor", type: "InlineType", product_title: "Inline Analytics Widget", price: "79.99"});
</script>
</body></html>`;
    const result = await parseProductPage(html);
    // ShopifyAnalytics is present but no direct/meta product object assignment,
    // so GID regex fallback triggers the generic-assignment strategy.
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("generic-assignment");
  });

  test("HTML with no product data returns null", async () => {
    const html = await readFixture("no-data.html");
    const result = await parseProductPage(html);
    expect(result).toBeNull();
  });

  test("HTML with multiple strategies: first with minimal data wins", async () => {
    // data-product-json takes priority over json-ld
    const html = `<!DOCTYPE html><html><head></head><body>
<script type="application/json" data-product-json="">{"title":"Priority Widget","handle":"priority","variants":[{"id":1,"price":"10.00","available":true}],"images":[],"media":[]}</script>
<script type="application/ld+json">{"@type":"Product","name":"LD Fallback","offers":{"price":"20.00","availability":"InStock"}}</script>
</body></html>`;
    const result = await parseProductPage(html);
    expect(result).not.toBeNull();
    expect(result!.strategy).toBe("data-product-json");
    expect(result!.product.title).toBe("Priority Widget");
  });
});

// ---------------------------------------------------------------------------
// hasMinimalData
// ---------------------------------------------------------------------------

describe("hasMinimalData", () => {
  test("result with title returns true", () => {
    const result: ParseResult = {
      strategy: "data-product-json",
      product: {
        title: "Widget",
        vendor: null,
        productType: null,
        variants: [],
        images: [],
        videos: [],
        rawPrice: null,
      },
    };
    expect(hasMinimalData(result)).toBe(true);
  });

  test("result with images returns true", () => {
    const result: ParseResult = {
      strategy: "data-product-json",
      product: {
        title: null,
        vendor: null,
        productType: null,
        variants: [],
        images: ["https://cdn.shopify.com/img.jpg"],
        videos: [],
        rawPrice: null,
      },
    };
    expect(hasMinimalData(result)).toBe(true);
  });

  test("result with videos returns true", () => {
    const result: ParseResult = {
      strategy: "data-product-json",
      product: {
        title: null,
        vendor: null,
        productType: null,
        variants: [],
        images: [],
        videos: [{ src: "https://cdn.shopify.com/v.mp4", format: "mp4", height: null, alt: null }],
        rawPrice: null,
      },
    };
    expect(hasMinimalData(result)).toBe(true);
  });

  test("empty product returns false", () => {
    const result: ParseResult = {
      strategy: "data-product-json",
      product: {
        title: null,
        vendor: null,
        productType: null,
        variants: [],
        images: [],
        videos: [],
        rawPrice: null,
      },
    };
    expect(hasMinimalData(result)).toBe(false);
  });
});
