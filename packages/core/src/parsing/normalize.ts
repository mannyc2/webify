import * as z from "zod/v4";
import type { WaybackProductData, WaybackVariantData } from "./types";
import { extractVideos } from "./video";

// Price transform schema
const priceSchema = z.unknown().transform((val): string => {
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.,-]/g, "").trim();
    return cleaned || "0.00";
  }
  if (typeof val === "number") {
    if (Number.isInteger(val) && val >= 100) return (val / 100).toFixed(2);
    return val.toFixed(2);
  }
  return "0.00";
});

/**
 * Normalize a price value to a string.
 * Shopify sometimes stores prices in cents (as numbers) or as formatted strings.
 */
export function normalizePrice(value: unknown): string {
  if (typeof value === "string") {
    // Remove currency symbols and whitespace
    const cleaned = value.replace(/[^0-9.,-]/g, "").trim();
    return cleaned || "0.00";
  }
  if (typeof value === "number") {
    // If the number looks like cents (>= 100 and is an integer), convert
    if (Number.isInteger(value) && value >= 100) {
      return (value / 100).toFixed(2);
    }
    return value.toFixed(2);
  }
  return "0.00";
}

const rawVariantSchema = z.looseObject({
  id: z.number().nullable().optional(),
  title: z.string().optional().default("Default"),
  price: priceSchema,
  compare_at_price: z.unknown().nullable().optional(),
  compareAtPrice: z.unknown().nullable().optional(),
  available: z.boolean().optional().default(true),
  sku: z.string().nullable().optional().default(null),
});

const rawShopifyProductSchema = z.looseObject({
  title: z.string().nullable().optional().default(null),
  vendor: z.string().nullable().optional().default(null),
  product_type: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  variants: z.array(z.unknown()).optional().default([]),
  images: z.array(z.unknown()).optional().default([]),
  media: z.array(z.unknown()).optional().default([]),
});

/**
 * Normalize a raw Shopify product JSON object (which varies between extraction
 * strategies) into our canonical WaybackProductData type.
 */
export function normalizeShopifyProduct(raw: any): WaybackProductData {
  const parsed = rawShopifyProductSchema.safeParse(raw);
  if (!parsed.success) {
    // Fallback: return empty product
    return { title: null, vendor: null, productType: null, variants: [], images: [], videos: [], rawPrice: null };
  }
  const data = parsed.data;

  const title = data.title;
  const vendor = data.vendor;
  const productType = data.product_type ?? data.productType ?? data.type ?? null;

  // Parse variants through schema
  const variants: WaybackVariantData[] = data.variants
    .map((v: unknown) => rawVariantSchema.safeParse(v))
    .filter((r: any) => r.success)
    .map((r: any) => {
      const v = r.data;
      const compareAtPrice = v.compare_at_price != null
        ? normalizePrice(v.compare_at_price)
        : v.compareAtPrice != null
          ? normalizePrice(v.compareAtPrice)
          : null;
      return {
        id: v.id ?? null,
        title: v.title,
        price: v.price,
        compareAtPrice,
        available: v.available,
        sku: v.sku ?? null,
      };
    });

  // Images
  const images: string[] = data.images
    .map((img: any) => {
      if (typeof img === "string") return img;
      if (typeof img?.src === "string") return img.src;
      if (typeof img?.url === "string") return img.url;
      return null;
    })
    .filter((url: string | null): url is string => url !== null);

  // Videos from media array
  const videos = extractVideos(data.media);

  const rawPrice = variants.length > 0 ? variants[0].price : null;
  return { title, vendor, productType, variants, images, videos, rawPrice };
}

/**
 * Recursively find Product entries in JSON-LD data.
 */
export function findJsonLdProducts(data: any): any[] {
  const results: any[] = [];
  if (!data || typeof data !== "object") return results;
  if (data["@type"] === "Product" || data["@type"] === "ProductGroup") {
    results.push(data);
    return results;
  }
  if (Array.isArray(data["@graph"])) {
    for (const item of data["@graph"]) {
      if (item["@type"] === "Product" || item["@type"] === "ProductGroup") {
        results.push(item);
      }
    }
  }
  return results;
}

/**
 * Normalize a JSON-LD Product object to our WaybackProductData.
 */
export function normalizeJsonLdProduct(ld: any): WaybackProductData {
  const title = typeof ld.name === "string" ? ld.name : null;
  const vendor = typeof ld.brand === "string"
    ? ld.brand
    : typeof ld.brand?.name === "string"
      ? ld.brand.name
      : null;
  const productType =
    typeof ld.category === "string" ? ld.category : null;

  // Images
  const rawImages = Array.isArray(ld.image)
    ? ld.image
    : typeof ld.image === "string"
      ? [ld.image]
      : [];
  const images: string[] = rawImages
    .map((img: any) => (typeof img === "string" ? img : img?.url ?? null))
    .filter((url: string | null): url is string => url !== null);

  // Variants from offers
  const offers = ld.offers
    ? Array.isArray(ld.offers)
      ? ld.offers
      : [ld.offers]
    : [];
  const variants: WaybackVariantData[] = offers.map(
    (offer: any): WaybackVariantData => ({
      id: null,
      title: typeof offer.name === "string" ? offer.name : "Default",
      price: normalizePrice(offer.price ?? offer.lowPrice ?? "0.00"),
      compareAtPrice: null,
      available:
        offer.availability === "https://schema.org/InStock" ||
        offer.availability === "http://schema.org/InStock" ||
        offer.availability === "InStock",
      sku: typeof offer.sku === "string" ? offer.sku : null,
    }),
  );

  const rawPrice = variants.length > 0 ? variants[0].price : null;

  return {
    title,
    vendor,
    productType,
    variants,
    images,
    videos: [],
    rawPrice,
  };
}
