import type { ScriptTag, ParseResult, WaybackProductData } from "../types";
import { extractBalancedObject, safeJsonParse } from "../script-extract";
import { normalizeShopifyProduct, normalizePrice } from "../normalize";

export function tryGenericAssignment(scripts: ScriptTag[]): ParseResult | null {
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
