// Wayback Machine / scraping types for archived Shopify product pages

/** CDX API row from archive.org */
export interface CDXRow {
  urlkey: string;
  timestamp: string; // 14-digit: YYYYMMDDHHmmss
  original: string;
  mimetype: string;
  statuscode: string;
  digest: string;
  length: string;
}

/** Parsed wayback snapshot metadata */
export interface WaybackSnapshot {
  url: string;
  handle: string;
  timestamp: string;
  digest: string;
  statusCode: number;
  mimeType: string;
  length: number;
}

/** Video data extracted from product page */
export interface WaybackVideoData {
  src: string;
  format: "mp4" | "webm" | "m3u8" | "youtube" | "vimeo" | "unknown";
  height: number | null;
  alt: string | null;
}

/** Full product data parsed from a wayback snapshot */
export interface WaybackProductData {
  title: string | null;
  vendor: string | null;
  productType: string | null;
  variants: WaybackVariantData[];
  images: string[];
  videos: WaybackVideoData[];
  rawPrice: string | null;
}

export interface WaybackVariantData {
  id: number | null;
  title: string;
  price: string;
  compareAtPrice: string | null;
  available: boolean;
  sku: string | null;
}

/** Which HTML parsing strategy succeeded */
export type ExtractionStrategy =
  | "data-product-json"
  | "meta-variable"
  | "product-variable"
  | "generic-assignment"
  | "json-ld";

/** Result of parsing a product page */
export interface ParseResult {
  strategy: ExtractionStrategy;
  product: WaybackProductData;
}
