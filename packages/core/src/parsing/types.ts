import type { ParseResult, WaybackProductData, WaybackVideoData, WaybackVariantData } from "../wayback-types";

export interface ScriptTag {
  type: string | null;
  dataAttrs: Record<string, string>;
  content: string;
}

// Re-export types strategies need
export type { ParseResult, WaybackProductData, WaybackVideoData, WaybackVariantData };
