// CDX API client for Archive.org Wayback Machine

import type { WaybackSnapshot } from "./wayback-types";

const CDX_API = "https://web.archive.org/cdx/search/cdx";
const USER_AGENT = "Webify/1.0 (product archive research)";

export interface CDXQueryOptions {
  domain: string;
  /** Specific handle to search for, or undefined for all products */
  handle?: string;
  /** Filter to this MIME type (default: text/html) */
  mimeFilter?: string;
  /** Filter by HTTP status code (default: 200) */
  statusFilter?: string;
  /** Collapse results by this field to deduplicate (default: digest) */
  collapseField?: string;
  /** Max results to return (default: 10000) */
  limit?: number;
}

/**
 * Query the Archive.org CDX API for snapshots of a Shopify store's product pages.
 * Uses prefix matching on /products/ path.
 */
export async function queryCdx(
  options: CDXQueryOptions,
): Promise<WaybackSnapshot[]> {
  const {
    domain,
    handle,
    mimeFilter = "text/html",
    statusFilter = "200",
    collapseField = "digest",
    limit = 10000,
  } = options;

  // Build URL for prefix-based search
  const matchUrl = handle
    ? `${domain}/products/${handle}`
    : `${domain}/products/*`;

  // CDX API uses filter= multiple times, so we build the URL manually
  const params = new URLSearchParams({
    url: matchUrl,
    output: "json",
    fl: "urlkey,timestamp,original,mimetype,statuscode,digest,length",
    collapse: collapseField,
    limit: String(limit),
  });

  // Append filter params manually since URLSearchParams would overwrite duplicates
  const url =
    `${CDX_API}?${params.toString()}` +
    `&filter=statuscode:${statusFilter}` +
    `&filter=mimetype:${mimeFilter}`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(
      `CDX API error: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  if (!text.trim()) return [];

  const rows: string[][] = JSON.parse(text);
  if (rows.length <= 1) return []; // First row is header

  // Skip header row
  return rows.slice(1).map(parseCdxRow).filter(isProductPage);
}

function parseCdxRow(row: string[]): WaybackSnapshot {
  const [_urlkey, timestamp, original, mimetype, statuscode, digest, length] =
    row;

  // Extract handle from URL path: /products/{handle}
  const handleMatch = original.match(/\/products\/([^/?#]+)/);
  const handle = handleMatch ? handleMatch[1] : "";

  return {
    url: original,
    handle,
    timestamp,
    digest,
    statusCode: parseInt(statuscode, 10),
    mimeType: mimetype,
    length: parseInt(length, 10) || 0,
  };
}

/** Filter out non-product pages (collections, tags, etc.) */
function isProductPage(snap: WaybackSnapshot): boolean {
  if (!snap.handle) return false;
  // Skip pagination, collection, tag, and asset URLs
  const skip = ["page", "collections", "tags", ".js", ".css", ".json"];
  return !skip.some(
    (s) => snap.handle.includes(s) || snap.url.includes(`/products/${s}`),
  );
}

/**
 * Build the Wayback Machine URL for a specific snapshot.
 * Uses the `id_` flag to get the original page without Wayback toolbar.
 */
export function waybackUrl(timestamp: string, originalUrl: string): string {
  return `https://web.archive.org/web/${timestamp}id_/${originalUrl}`;
}

/**
 * Deduplicate snapshots by digest + day.
 * Keeps only one snapshot per unique content per day.
 */
export function deduplicateByDigestDay(
  snapshots: WaybackSnapshot[],
): WaybackSnapshot[] {
  const seen = new Set<string>();
  return snapshots.filter((snap) => {
    const day = snap.timestamp.slice(0, 8); // YYYYMMDD
    const key = `${snap.digest}:${day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
