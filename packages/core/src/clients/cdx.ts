import { z } from "zod";
import type { WaybackSnapshot } from "../wayback-types";

const CDX_API = "https://web.archive.org/cdx/search/cdx";
const USER_AGENT = "Webify/1.0 (product archive research)";

// Zod schema for CDX API row validation
const cdxRowSchema = z.tuple([
  z.string(), // urlkey
  z.string(), // timestamp
  z.string(), // original
  z.string(), // mimetype
  z.string(), // statuscode
  z.string(), // digest
  z.string(), // length
]);

export interface CDXQueryOptions {
  domain: string;
  handle?: string;
  mimeFilter?: string;
  statusFilter?: string;
  collapseField?: string;
  limit?: number;
}

export async function queryCdx(options: CDXQueryOptions): Promise<WaybackSnapshot[]> {
  const {
    domain,
    handle,
    mimeFilter = "text/html",
    statusFilter = "200",
    collapseField = "digest",
    limit = 10000,
  } = options;

  const matchUrl = handle
    ? `${domain}/products/${handle}`
    : `${domain}/products/*`;

  const params = new URLSearchParams({
    url: matchUrl,
    output: "json",
    fl: "urlkey,timestamp,original,mimetype,statuscode,digest,length",
    collapse: collapseField,
    limit: String(limit),
  });

  const url =
    `${CDX_API}?${params.toString()}` +
    `&filter=statuscode:${statusFilter}` +
    `&filter=mimetype:${mimeFilter}`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`CDX API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text.trim()) return [];

  const rows: unknown[] = JSON.parse(text);
  if (rows.length <= 1) return [];

  // Skip header row, validate each row with Zod
  return rows.slice(1)
    .filter((row): row is z.output<typeof cdxRowSchema> => cdxRowSchema.safeParse(row).success)
    .map(parseCdxRow)
    .filter(isProductPage);
}

export function parseCdxRow(row: string[]): WaybackSnapshot {
  const [, timestamp, original, mimetype, statuscode, digest, length] = row;
  const handle = extractProductHandle(original);
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

export function isProductPage(snap: WaybackSnapshot): boolean {
  if (!snap.handle) return false;
  const skip = ["page", "collections", "tags", ".js", ".css", ".json"];
  return !skip.some(
    (s) => snap.handle.includes(s) || snap.url.includes(`/products/${s}`),
  );
}

export function waybackUrl(timestamp: string, originalUrl: string): string {
  return `https://web.archive.org/web/${timestamp}id_/${originalUrl}`;
}

export function deduplicateByDigestDay(snapshots: WaybackSnapshot[]): WaybackSnapshot[] {
  const seen = new Set<string>();
  return snapshots.filter((snap) => {
    const day = snap.timestamp.slice(0, 8);
    const key = `${snap.digest}:${day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Convert 14-digit Wayback timestamp (YYYYMMDDHHmmss) to ISO 8601 string */
export function waybackTimestampToISO(ts: string): string {
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)}Z`;
}

/** Extract product handle from a URL path like /products/{handle} */
export function extractProductHandle(url: string): string {
  const match = url.match(/\/products\/([^/?#]+)/);
  return match ? match[1] : "";
}

/** Filter CDX snapshots to only those not already known */
export function filterNewSnapshots(
  cdxSnapshots: WaybackSnapshot[],
  existingKeys: Set<string>,
): WaybackSnapshot[] {
  return cdxSnapshots.filter(s => !existingKeys.has(`${s.digest}:${s.timestamp}`));
}
