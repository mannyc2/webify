import type { ScriptTag, ParseResult } from "../types";
import { safeJsonParse } from "../script-extract";
import { normalizeShopifyProduct } from "../normalize";

export function tryDataProductJson(scripts: ScriptTag[]): ParseResult | null {
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
