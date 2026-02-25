import type { ScriptTag, ParseResult } from "../types";
import { extractBalancedObject, safeJsonParse } from "../script-extract";
import { normalizeShopifyProduct } from "../normalize";

export function tryMetaVariable(scripts: ScriptTag[]): ParseResult | null {
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
