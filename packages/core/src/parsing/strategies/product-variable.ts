import type { ScriptTag, ParseResult } from "../types";
import { extractBalancedObject, safeJsonParse } from "../script-extract";
import { normalizeShopifyProduct } from "../normalize";

export function tryProductVariable(scripts: ScriptTag[]): ParseResult | null {
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
