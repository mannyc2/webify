import type { ParseResult } from "./types";
import { extractScriptContents } from "./script-extract";
import { tryDataProductJson } from "./strategies/data-product-json";
import { tryMetaVariable } from "./strategies/meta-variable";
import { tryProductVariable } from "./strategies/product-variable";
import { tryGenericAssignment } from "./strategies/generic-assignment";
import { tryJsonLd } from "./strategies/json-ld";

/**
 * A result is "useful" if it has at least a title, images, or videos.
 * Strategies like `var meta` sometimes match with empty product data —
 * skip those so richer results from later strategies can win.
 */
export function hasMinimalData(result: ParseResult): boolean {
  const p = result.product;
  return p.title !== null || p.images.length > 0 || p.videos.length > 0;
}

/**
 * Parse a Shopify product page HTML and extract product data.
 * Tries 5 strategies in order, returns first result with meaningful data.
 * Falls back to any match if no strategy yields useful data.
 */
export async function parseProductPage(html: string): Promise<ParseResult | null> {
  const scripts = await extractScriptContents(html);

  const s1 = tryDataProductJson(scripts);
  if (s1 && hasMinimalData(s1)) return s1;

  const s2 = tryMetaVariable(scripts);
  if (s2 && hasMinimalData(s2)) return s2;

  const s3 = tryProductVariable(scripts);
  if (s3 && hasMinimalData(s3)) return s3;

  const s4 = tryGenericAssignment(scripts);
  if (s4 && hasMinimalData(s4)) return s4;

  const s5 = tryJsonLd(scripts);
  if (s5 && hasMinimalData(s5)) return s5;

  return s1 ?? s2 ?? s3 ?? s4 ?? s5 ?? null;
}
