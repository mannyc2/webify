import type { ScriptTag } from "./types";

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

/**
 * Extract a JSON object starting from a given position in text.
 * Uses balanced brace counting to find the matching closing brace.
 * Handles strings (including escaped quotes) correctly.
 */
export function extractBalancedObject(text: string, startIdx: number): string | null {
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
export function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
