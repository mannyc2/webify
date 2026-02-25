import { describe, expect, test } from "bun:test";
import { fetchProducts, type ShopifyProduct } from "../clients/shopify";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(id: number): ShopifyProduct {
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
    variants: [
      {
        id: id * 10,
        title: "Default",
        sku: null,
        price: "29.99",
        compare_at_price: null,
        available: true,
        position: 1,
      },
    ],
  };
}

function mockFetch(
  pages: ShopifyProduct[][],
): typeof globalThis.fetch {
  let call = 0;
  return (async () => {
    const products = pages[call] ?? [];
    call++;
    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// fetchProducts
// ---------------------------------------------------------------------------

describe("fetchProducts", () => {
  test("single page of products", async () => {
    const products = [makeProduct(1), makeProduct(2)];
    const fetcher = mockFetch([products, []]);

    const result = await fetchProducts("test.myshopify.com", fetcher);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  test("multi-page pagination", async () => {
    const page1 = [makeProduct(1)];
    const page2 = [makeProduct(2)];
    const fetcher = mockFetch([page1, page2, []]);

    const result = await fetchProducts("test.myshopify.com", fetcher);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  test("HTTP error throws", async () => {
    const fetcher = (async () =>
      new Response("Not Found", { status: 404, statusText: "Not Found" })
    ) as unknown as typeof globalThis.fetch;

    expect(
      fetchProducts("bad.myshopify.com", fetcher),
    ).rejects.toThrow("Shopify fetch failed");
  });

  test("invalid JSON / Zod validation failure throws", async () => {
    const fetcher = (async () =>
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof globalThis.fetch;

    expect(
      fetchProducts("bad.myshopify.com", fetcher),
    ).rejects.toThrow();
  });
});
