// Shopify /products.json client — ported from watchify/DTOs/ShopifyProduct.swift

import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas for Shopify /products.json response
// ---------------------------------------------------------------------------

export const shopifyImageSchema = z.object({
  src: z.string(),
});

export const shopifyVariantSchema = z.object({
  id: z.number(),
  title: z.string(),
  sku: z.string().nullable(),
  price: z.string(),
  compare_at_price: z.string().nullable(),
  available: z.boolean(),
  position: z.number(),
});

export const shopifyProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  handle: z.string(),
  vendor: z.string().nullable(),
  product_type: z.string().nullable(),
  created_at: z.string().nullable(),
  published_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  images: z.array(shopifyImageSchema),
  variants: z.array(shopifyVariantSchema),
});

const shopifyProductsResponseSchema = z.object({
  products: z.array(shopifyProductSchema),
});

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type ShopifyImage = z.infer<typeof shopifyImageSchema>;
export type ShopifyVariant = z.infer<typeof shopifyVariantSchema>;
export type ShopifyProduct = z.infer<typeof shopifyProductSchema>;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Fetches all products from a Shopify store, handling pagination.
 * Uses the legacy page-based pagination: /products.json?limit=250&page=N
 */
type Fetcher = typeof globalThis.fetch;

export async function fetchProducts(
  domain: string,
  fetcher: Fetcher = globalThis.fetch,
): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let page = 1;

  while (true) {
    const url = `https://${domain}/products.json?limit=250&page=${page}`;
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `Shopify fetch failed for ${domain}: ${response.status} ${response.statusText}`,
      );
    }

    const raw = await response.json();
    const data = shopifyProductsResponseSchema.parse(raw);

    if (data.products.length === 0) {
      break;
    }

    allProducts.push(...data.products);
    page++;
  }

  return allProducts;
}
