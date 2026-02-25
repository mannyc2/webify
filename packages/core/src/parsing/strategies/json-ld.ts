import type { ScriptTag, ParseResult } from "../types";
import { safeJsonParse } from "../script-extract";
import { findJsonLdProducts, normalizeJsonLdProduct } from "../normalize";

export function tryJsonLd(scripts: ScriptTag[]): ParseResult | null {
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
