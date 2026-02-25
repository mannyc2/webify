import { sql, inArray, eq, gt, desc } from "drizzle-orm"
import { stores, products, scrapeState, changeEvents, queueJobs } from "@webify/db"
import { getDb } from "@/lib/api/db"
import { getEnv } from "@/lib/api/env"
import { handleApiError } from "@/lib/api/errors"

export async function GET() {
  try {
    const db = getDb(getEnv())
    const now = new Date()
    const nowIso = now.toISOString()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const [
      activeJobs,
      recentJobs,
      syncCounts,
      allStores,
      scrapeCounts,
      scrapeFailures,
      eventsLastHour,
      eventsLastDay,
      eventsByType,
    ] = await Promise.all([
      // 1. Active jobs
      db.select().from(queueJobs)
        .where(inArray(queueJobs.status, ["queued", "running"]))
        .orderBy(desc(queueJobs.createdAt)),

      // 2. Recent completed/failed jobs
      db.select().from(queueJobs)
        .where(inArray(queueJobs.status, ["completed", "failed"]))
        .orderBy(desc(queueJobs.completedAt))
        .limit(30),

      // 3. Store sync counts
      db.select({
        total: sql<number>`count(*)`,
        pending: sql<number>`sum(case when ${stores.syncStatus} = 'pending' then 1 else 0 end)`,
        healthy: sql<number>`sum(case when ${stores.syncStatus} = 'healthy' then 1 else 0 end)`,
        failing: sql<number>`sum(case when ${stores.syncStatus} = 'failing' then 1 else 0 end)`,
        stale: sql<number>`sum(case when ${stores.syncStatus} = 'stale' then 1 else 0 end)`,
      }).from(stores),

      // 4. All stores (for computing overdue + failing)
      db.select({
        domain: stores.domain,
        name: stores.name,
        syncStatus: stores.syncStatus,
        lastFetchedAt: stores.lastFetchedAt,
        syncFrequencySeconds: stores.syncFrequencySeconds,
        lastError: stores.lastError,
      }).from(stores),

      // 5. Scrape counts
      db.select({
        total: sql<number>`count(*)`,
        pending: sql<number>`sum(case when ${scrapeState.scrapeStatus} = 'pending' then 1 else 0 end)`,
        success: sql<number>`sum(case when ${scrapeState.scrapeStatus} = 'success' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${scrapeState.scrapeStatus} = 'failed' then 1 else 0 end)`,
        skipped: sql<number>`sum(case when ${scrapeState.scrapeStatus} = 'skipped' then 1 else 0 end)`,
      }).from(scrapeState),

      // 6. Recent scrape failures (join with products for title)
      db.select({
        productId: scrapeState.productId,
        productTitle: products.title,
        storeDomain: products.storeDomain,
        scrapeStatus: scrapeState.scrapeStatus,
        lastScrapedAt: scrapeState.lastScrapedAt,
        lastError: scrapeState.lastError,
      })
        .from(scrapeState)
        .innerJoin(products, eq(scrapeState.productId, products.id))
        .where(eq(scrapeState.scrapeStatus, "failed"))
        .limit(10),

      // 7. Events last hour
      db.select({ count: sql<number>`count(*)` })
        .from(changeEvents)
        .where(gt(changeEvents.occurredAt, oneHourAgo)),

      // 8. Events last day
      db.select({ count: sql<number>`count(*)` })
        .from(changeEvents)
        .where(gt(changeEvents.occurredAt, oneDayAgo)),

      // 9. Events by type (24h)
      db.select({
        changeType: changeEvents.changeType,
        count: sql<number>`count(*)`,
      })
        .from(changeEvents)
        .where(gt(changeEvents.occurredAt, oneDayAgo))
        .groupBy(changeEvents.changeType),
    ])

    // Compute overdue + failing stores from allStores
    const nowMs = now.getTime()
    const overdue = allStores
      .filter((s) => {
        if (!s.lastFetchedAt) return true
        const elapsed = (nowMs - new Date(s.lastFetchedAt).getTime()) / 1000
        return elapsed > s.syncFrequencySeconds
      })
      .map((s) => ({
        domain: s.domain,
        name: s.name,
        syncStatus: s.syncStatus,
        lastFetchedAt: s.lastFetchedAt,
        syncFrequencySeconds: s.syncFrequencySeconds,
        overdueSeconds: s.lastFetchedAt
          ? Math.round((nowMs - new Date(s.lastFetchedAt).getTime()) / 1000 - s.syncFrequencySeconds)
          : Math.round(nowMs / 1000),
      }))

    const failingStores = allStores
      .filter((s) => s.lastError)
      .map((s) => ({
        domain: s.domain,
        name: s.name,
        lastFetchedAt: s.lastFetchedAt,
        lastError: s.lastError,
      }))

    const sc = syncCounts[0]
    const scr = scrapeCounts[0]

    return Response.json({
      generatedAt: nowIso,
      jobs: {
        active: activeJobs,
        recent: recentJobs,
      },
      sync: {
        counts: {
          total: sc?.total ?? 0,
          pending: sc?.pending ?? 0,
          healthy: sc?.healthy ?? 0,
          failing: sc?.failing ?? 0,
          stale: sc?.stale ?? 0,
        },
        overdue,
        failing: failingStores,
      },
      scrape: {
        counts: {
          total: scr?.total ?? 0,
          pending: scr?.pending ?? 0,
          success: scr?.success ?? 0,
          failed: scr?.failed ?? 0,
          skipped: scr?.skipped ?? 0,
        },
        recentFailures: scrapeFailures,
      },
      activity: {
        lastHour: eventsLastHour[0]?.count ?? 0,
        lastDay: eventsLastDay[0]?.count ?? 0,
        byType: eventsByType,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
