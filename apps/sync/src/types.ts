export interface Env {
  DB: D1Database;
  SYNC_QUEUE: Queue<SyncJobMessage>;
}

export interface SyncJobMessage {
  domain: string;
}
