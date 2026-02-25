export interface Env {
  DB: D1Database;
  SYNC_QUEUE: Queue<SyncJobMessage>;
  SCRAPE_QUEUE: Queue<ScrapeJobMessage>;
}

export interface SyncJobMessage {
  domain: string;
  queueJobId?: string;
}

// Discriminated union for scrape queue messages
export type ScrapeJobMessage =
  | { type: "scrape_stale"; domain: string; queueJobId?: string; parentJobId?: string }
  | { type: "scrape_product"; domain: string; productId: number; handle: string }
  | { type: "archive_discover"; domain: string; jobId: string; queueJobId?: string }
  | { type: "archive_batch"; domain: string; jobId: string; snapshots: ArchiveBatchSnapshot[] };

export interface ArchiveBatchSnapshot {
  id: number;        // wayback_snapshots row ID
  timestamp: string; // 14-digit
  url: string;       // original URL
}
