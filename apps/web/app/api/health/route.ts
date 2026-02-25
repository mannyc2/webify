import { sql } from "drizzle-orm";
import { stores } from "@webify/db";
import { getDb } from "@/lib/api/db";
import { getEnv } from "@/lib/api/env";
import { handleApiError } from "@/lib/api/errors";


export async function GET() {
  try {
    const db = getDb(getEnv());

    const [counts] = await db
      .select({
        total: sql<number>`count(*)`,
        healthy: sql<number>`sum(case when ${stores.syncStatus} = 'healthy' then 1 else 0 end)`,
        failing: sql<number>`sum(case when ${stores.syncStatus} = 'failing' then 1 else 0 end)`,
        stale: sql<number>`sum(case when ${stores.syncStatus} = 'stale' then 1 else 0 end)`,
        lastSyncTime: sql<string | null>`max(${stores.lastFetchedAt})`,
      })
      .from(stores);

    return Response.json({
      total: counts.total,
      healthy: counts.healthy ?? 0,
      failing: counts.failing ?? 0,
      stale: counts.stale ?? 0,
      last_sync_time: counts.lastSyncTime,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
