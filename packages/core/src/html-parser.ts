// HTMLRewriter-based parser for Shopify product pages (archived via Wayback Machine)

import type {
  ParseResult,
  WaybackProductData,
  WaybackVideoData,
  WaybackVariantData,
} from "./wayback-types";

// ---------------------------------------------------------------------------
// Script tag extraction via HTMLRewriter
// ---------------------------------------------------------------------------

interface ScriptTag {
  type: string | null; // the type="" attribute
  dataAttrs: Record<string, string>; // any data-* attributes
  content: string; // text content of the script
}

/**
 * Extract all script tags from HTML using HTMLRewriter.
 * Returns array of { type, dataAttrs, content }.
 */
export async function extractScriptContents(
  html: string,
): Promise<ScriptTag[]> {
  const scripts: ScriptTag[] = [];
  let current: ScriptTag | null = null;

  const rewriter = new HTMLRewriter().on("script", {
    element(el) {
      current = {
        type: el.getAttribute("type"),
        dataAttrs: {},
        content: "",
      };
      // Capture data-* attributes we care about
      const dataProductJson = el.getAttribute("data-product-json");
      if (dataProductJson !== null) {
        current.dataAttrs["data-product-json"] = dataProductJson;
      }
      // Also capture id attribute for identification
      const id = el.getAttribute("id");
      if (id !== null) {
        current.dataAttrs["id"] = id;
      }
    },
    text(chunk) {
      if (current) {
        current.content += chunk.text;
        if (chunk.lastInTextNode) {
          scripts.push(current);
          current = null;
        }
      }
    },
  });

  // HTMLRewriter works on Response objects
  const response = new Response(html);
  await rewriter.transform(response).text();
  // Push any remaining current (if lastInTextNode wasn't called)
  if (current) scripts.push(current);

  return scripts;
}

// ---------------------------------------------------------------------------
// Balanced brace extraction
// ---------------------------------------------------------------------------

/**
 * Extract a JSON object starting from a given position in text.
 * Uses balanced brace counting to find the matching closing brace.
 * Handles strings (including escaped quotes) correctly.
 */
function extractBalancedObject(text: string, startIdx: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Safely parse JSON, returning null on failure.
 */
function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Video format detection
// ---------------------------------------------------------------------------

function detectVideoFormat(
  src: string,
  explicitFormat?: string,
): WaybackVideoData["format"] {
  if (explicitFormat) {
    const f = explicitFormat.toLowerCase();
    if (f.includes("mp4")) return "mp4";
    if (f.includes("webm")) return "webm";
    if (f.includes("m3u8") || f.includes("hls")) return "m3u8";
  }
  const url = src.toLowerCase();
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".webm")) return "webm";
  if (url.includes(".m3u8")) return "m3u8";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Video extraction from Shopify media array
// ---------------------------------------------------------------------------

/**
 * Extract video data from Shopify's media array.
 * Handles both native Shopify videos (with sources array) and external
 * videos (YouTube/Vimeo with host field).
 */
function extractVideos(media: any[]): WaybackVideoData[] {
  if (!Array.isArray(media)) return [];

  const videos: WaybackVideoData[] = [];

  for (const item of media) {
    const mediaType = item.media_type ?? item.type ?? "";
    if (
      typeof mediaType !== "string" ||
      !mediaType.toLowerCase().includes("video")
    ) {
      continue;
    }

    // External video (YouTube / Vimeo)
    if (item.host === "youtube" || item.host === "vimeo") {
      const src =
        item.embed_url ?? item.external_url ?? item.url ?? item.src ?? "";
      if (src) {
        videos.push({
          src,
          format: item.host === "youtube" ? "youtube" : "vimeo",
          height: typeof item.height === "number" ? item.height : null,
          alt: typeof item.alt === "string" ? item.alt : null,
        });
      }
      continue;
    }

    // Native Shopify video with sources array
    const sources = item.sources ?? item.src_set ?? [];
    if (Array.isArray(sources) && sources.length > 0) {
      for (const source of sources) {
        const src = source.url ?? source.src ?? "";
        if (!src) continue;
        videos.push({
          src,
          format: detectVideoFormat(src, source.format ?? source.mime_type),
          height:
            typeof source.height === "number"
              ? source.height
              : typeof item.height === "number"
                ? item.height
                : null,
          alt: typeof item.alt === "string" ? item.alt : null,
        });
      }
    } else {
      // Fallback: video item with a direct URL
      const src = item.url ?? item.src ?? "";
      if (src) {
        videos.push({
          src,
          format: detectVideoFormat(src),
          height: typeof item.height === "number" ? item.height : null,
          alt: typeof item.alt === "string" ? item.alt : null,
        });
      }
    }
  }

  return videos;
}

// ---------------------------------------------------------------------------
// Product normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw Shopify product JSON object (which varies between extraction
 * strategies) into our canonical WaybackProductData type.
 */
function normalizeShopifyProduct(raw: any): WaybackProductData {
  const title =
    typeof raw.title === "string" ? raw.title : null;
  const vendor =
    typeof raw.vendor === "string" ? raw.vendor : null;
  const productType =
    typeof raw.product_type === "string"
      ? raw.product_type
      : typeof raw.productType === "string"
        ? raw.productType
        : typeof raw.type === "string"
          ? raw.type
          : null;

  // Variants
  const rawVariants = Array.isArray(raw.variants) ? raw.variants : [];
  const variants: WaybackVariantData[] = rawVariants.map((v: any) => ({
    id: typeof v.id === "number" ? v.id : null,
    title: typeof v.title === "string" ? v.title : "Default",
    price: normalizePrice(v.price),
    compareAtPrice: v.compare_at_price != null
      ? normalizePrice(v.compare_at_price)
      : v.compareAtPrice != null
        ? normalizePrice(v.compareAtPrice)
        : null,
    available: typeof v.available === "boolean" ? v.available : true,
    sku: typeof v.sku === "string" ? v.sku : null,
  }));

  // Images
  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const images: string[] = rawImages
    .map((img: any) => {
      if (typeof img === "string") return img;
      if (typeof img?.src === "string") return img.src;
      if (typeof img?.url === "string") return img.url;
      return null;
    })
    .filter((url: string | null): url is string => url !== null);

  // Videos from media array
  const rawMedia = Array.isArray(raw.media) ? raw.media : [];
  const videos = extractVideos(rawMedia);

  // Raw price: first variant's price
  const rawPrice = variants.length > 0 ? variants[0].price : null;

  return { title, vendor, productType, variants, images, videos, rawPrice };
}

/**
 * Normalize a price value to a string.
 * Shopify sometimes stores prices in cents (as numbers) or as formatted strings.
 */
function normalizePrice(value: any): string {
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

// ---------------------------------------------------------------------------
// Strategy 1: data-product-json attribute
// ---------------------------------------------------------------------------

function tryDataProductJson(scripts: ScriptTag[]): ParseResult | null {
  for (const script of scripts) {
    if (
      "data-product-json" in script.dataAttrs ||
      script.dataAttrs["id"]?.includes("product-json") ||
      script.type === "application/json"
    ) {
      const content = script.content.trim();
      if (!content) continue;

      const parsed = safeJsonParse(content);
      if (!parsed) continue;

      // The JSON could be the product directly, or wrapped in { product: ... }
      const productObj = parsed.product ?? parsed;

      // Validate it looks like a Shopify product
      if (productObj.title || productObj.variants || productObj.handle) {
        return {
          strategy: "data-product-json",
          product: normalizeShopifyProduct(productObj),
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 2: var meta = { ... }
// ---------------------------------------------------------------------------

function tryMetaVariable(scripts: ScriptTag[]): ParseResult | null {
  for (const script of scripts) {
    const content = script.content;
    // Look for: var meta = { ... }
    const metaIdx = content.indexOf("var meta");
    if (metaIdx === -1) continue;

    // Find the opening brace after "var meta"
    const braceIdx = content.indexOf("{", metaIdx);
    if (braceIdx === -1) continue;

    const objStr = extractBalancedObject(content, braceIdx);
    if (!objStr) continue;

    const meta = safeJsonParse(objStr);
    if (!meta) continue;

    // The meta object should have a "product" property
    if (meta.product && (meta.product.title || meta.product.variants)) {
      return {
        strategy: "meta-variable",
        product: normalizeShopifyProduct(meta.product),
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 3: var product = { ... } or product: { ... }
// ---------------------------------------------------------------------------

function tryProductVariable(scripts: ScriptTag[]): ParseResult | null {
  // Patterns to search for, in priority order
  const patterns = [
    /var\s+product\s*=\s*\{/,
    /let\s+product\s*=\s*\{/,
    /const\s+product\s*=\s*\{/,
    /\w+\.product\s*=\s*\{/,
    /product\s*:\s*\{/,
  ];

  for (const script of scripts) {
    const content = script.content;

    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (!match) continue;

      // Find the opening brace in the match
      const matchText = match[0];
      const braceOffset = matchText.lastIndexOf("{");
      const braceIdx = match.index + braceOffset;

      const objStr = extractBalancedObject(content, braceIdx);
      if (!objStr) continue;

      const parsed = safeJsonParse(objStr);
      if (!parsed) continue;

      // Validate it looks like a product
      if (parsed.title || parsed.variants || parsed.handle) {
        return {
          strategy: "product-variable",
          product: normalizeShopifyProduct(parsed),
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 4: ShopifyAnalytics.meta.product patterns
// ---------------------------------------------------------------------------

function tryGenericAssignment(scripts: ScriptTag[]): ParseResult | null {
  for (const script of scripts) {
    const content = script.content;

    // Look for ShopifyAnalytics.meta patterns
    if (!content.includes("ShopifyAnalytics")) continue;

    // Try to extract product data from ShopifyAnalytics assignments
    // Common patterns:
    //   ShopifyAnalytics.meta.product = { ... }
    //   ShopifyAnalytics.meta = { ... product: { ... } ... }
    //   meta.product = { ... }

    // First try: ShopifyAnalytics.meta.product = { ... }
    const directPattern =
      /ShopifyAnalytics\.meta\.product\s*=\s*\{/;
    const directMatch = directPattern.exec(content);
    if (directMatch) {
      const braceIdx =
        directMatch.index + directMatch[0].lastIndexOf("{");
      const objStr = extractBalancedObject(content, braceIdx);
      if (objStr) {
        const parsed = safeJsonParse(objStr);
        if (parsed && (parsed.id || parsed.gid || parsed.title)) {
          // This is typically minimal data (id, gid, vendor, type, variants)
          return {
            strategy: "generic-assignment",
            product: normalizeShopifyProduct(parsed),
          };
        }
      }
    }

    // Second try: ShopifyAnalytics.meta = { ... } which contains product key
    const metaPattern = /ShopifyAnalytics\.meta\s*=\s*\{/;
    const metaMatch = metaPattern.exec(content);
    if (metaMatch) {
      const braceIdx = metaMatch.index + metaMatch[0].lastIndexOf("{");
      const objStr = extractBalancedObject(content, braceIdx);
      if (objStr) {
        const parsed = safeJsonParse(objStr);
        if (parsed?.product) {
          return {
            strategy: "generic-assignment",
            product: normalizeShopifyProduct(parsed.product),
          };
        }
      }
    }

    // Third try: extract individual fields via regex
    const gidMatch = content.match(
      /gid\s*:\s*["']gid:\/\/shopify\/Product\/(\d+)["']/,
    );
    const vendorMatch = content.match(/vendor\s*:\s*["']([^"']+)["']/);
    const typeMatch = content.match(/type\s*:\s*["']([^"']+)["']/);
    const titleMatch = content.match(
      /(?:product_)?title\s*:\s*["']([^"']+)["']/,
    );

    if (gidMatch || titleMatch) {
      // Try to find a price nearby
      const priceMatch = content.match(
        /price\s*[:=]\s*["']?(\d+(?:\.\d+)?)["']?/,
      );

      const product: WaybackProductData = {
        title: titleMatch ? titleMatch[1] : null,
        vendor: vendorMatch ? vendorMatch[1] : null,
        productType: typeMatch ? typeMatch[1] : null,
        variants: priceMatch
          ? [
              {
                id: null,
                title: "Default",
                price: normalizePrice(priceMatch[1]),
                compareAtPrice: null,
                available: true,
                sku: null,
              },
            ]
          : [],
        images: [],
        videos: [],
        rawPrice: priceMatch ? normalizePrice(priceMatch[1]) : null,
      };

      return { strategy: "generic-assignment", product };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 5: JSON-LD
// ---------------------------------------------------------------------------

function tryJsonLd(scripts: ScriptTag[]): ParseResult | null {
  for (const script of scripts) {
    if (script.type !== "application/ld+json") continue;

    const content = script.content.trim();
    if (!content) continue;

    const parsed = safeJsonParse(content);
    if (!parsed) continue;

    // JSON-LD can be an array or a single object
    const items = Array.isArray(parsed) ? parsed : [parsed];

    for (const item of items) {
      // Look for @type: "Product" at top level or in @graph
      const products = findJsonLdProducts(item);
      if (products.length === 0) continue;

      const ldProduct = products[0];
      const product = normalizeJsonLdProduct(ldProduct);
      return { strategy: "json-ld", product };
    }
  }
  return null;
}

/**
 * Recursively find Product entries in JSON-LD data.
 */
function findJsonLdProducts(data: any): any[] {
  const results: any[] = [];

  if (!data || typeof data !== "object") return results;

  // Check if this item is a Product
  if (data["@type"] === "Product" || data["@type"] === "ProductGroup") {
    results.push(data);
    return results;
  }

  // Check @graph array
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
function normalizeJsonLdProduct(ld: any): WaybackProductData {
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * A result is "useful" if it has at least a title, images, or videos.
 * Strategies like `var meta` sometimes match with empty product data —
 * skip those so richer results from later strategies can win.
 */
function hasMinimalData(result: ParseResult): boolean {
  const p = result.product;
  return p.title !== null || p.images.length > 0 || p.videos.length > 0;
}

/**
 * Parse a Shopify product page HTML and extract product data.
 * Tries 5 strategies in order, returns first result with meaningful data.
 * Falls back to any match if no strategy yields useful data.
 */
export async function parseProductPage(
  html: string,
): Promise<ParseResult | null> {
  const scripts = await extractScriptContents(html);

  // Strategy 1: data-product-json attribute
  const s1 = tryDataProductJson(scripts);
  if (s1 && hasMinimalData(s1)) return s1;

  // Strategy 2: var meta = { ... }
  const s2 = tryMetaVariable(scripts);
  if (s2 && hasMinimalData(s2)) return s2;

  // Strategy 3: var product = { ... }, obj.product = { ... }, product: { ... }
  const s3 = tryProductVariable(scripts);
  if (s3 && hasMinimalData(s3)) return s3;

  // Strategy 4: ShopifyAnalytics.meta.product patterns
  const s4 = tryGenericAssignment(scripts);
  if (s4 && hasMinimalData(s4)) return s4;

  // Strategy 5: JSON-LD
  const s5 = tryJsonLd(scripts);
  if (s5 && hasMinimalData(s5)) return s5;

  // Fall back to any match (even without title/images/videos)
  return s1 ?? s2 ?? s3 ?? s4 ?? s5 ?? null;
}
