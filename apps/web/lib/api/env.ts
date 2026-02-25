import { env } from "cloudflare:workers";

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  SYNC_QUEUE: Queue;
}

export function getEnv(): Env {
  return env as unknown as Env;
}
