"use client"

import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useQueueStatus } from "@/hooks/use-queue-status"

function formatDuration(ms: number | null): string {
  if (ms == null) return "\u2014"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return `${mins}m ${secs}s`
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "\u2014"
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

function jobTypeLabel(jt: string): string {
  switch (jt) {
    case "sync_store": return "Sync Store"
    case "scrape_stale": return "Scrape Stale"
    case "archive_discover": return "Archive Discover"
    default: return jt
  }
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "running": return "default" as const
    case "queued": return "outline" as const
    case "completed": return "secondary" as const
    case "failed": return "destructive" as const
    default: return "outline" as const
  }
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function QueueStatusPage() {
  const { data, isLoading, dataUpdatedAt } = useQueueStatus()

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Header title="Queue Status" description="Sync and scrape pipeline health." />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      <Header title="Queue Status" description="Sync and scrape pipeline health." />

      <p className="text-xs text-muted-foreground">
        Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "\u2014"}
        {" \u00b7 "}Auto-refreshes every 10s
      </p>

      {/* Active Jobs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Active Jobs</h2>
        {data.jobs.active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active jobs.</p>
        ) : (
          <Card size="sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.jobs.active.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{jobTypeLabel(job.jobType)}</TableCell>
                      <TableCell className="font-mono text-xs">{job.storeDomain}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
                      </TableCell>
                      <TableCell>{formatRelativeTime(job.startedAt)}</TableCell>
                      <TableCell>{formatDuration(job.durationMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent Jobs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Jobs</h2>
        {data.jobs.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent jobs.</p>
        ) : (
          <Card size="sm">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.jobs.recent.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{jobTypeLabel(job.jobType)}</TableCell>
                      <TableCell className="font-mono text-xs">{job.storeDomain}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDuration(job.durationMs)}</TableCell>
                      <TableCell className={job.status === "failed" ? "text-destructive" : ""}>
                        {job.status === "failed"
                          ? (job.error?.slice(0, 80) ?? "Unknown error")
                          : (job.resultSummary ?? "\u2014")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Sync Pipeline */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Sync Pipeline</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total" value={data.sync.counts.total} />
          <StatCard label="Healthy" value={data.sync.counts.healthy} />
          <StatCard label="Failing" value={data.sync.counts.failing} />
          <StatCard label="Stale" value={data.sync.counts.stale} />
        </div>

        {data.sync.overdue.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Overdue Stores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Fetched</TableHead>
                    <TableHead>Overdue By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sync.overdue.map((s) => (
                    <TableRow key={s.domain}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.syncStatus}</Badge>
                      </TableCell>
                      <TableCell>{formatRelativeTime(s.lastFetchedAt)}</TableCell>
                      <TableCell>{formatDuration(s.overdueSeconds * 1000)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {data.sync.failing.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Failing Stores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Last Fetched</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sync.failing.map((s) => (
                    <TableRow key={s.domain}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{formatRelativeTime(s.lastFetchedAt)}</TableCell>
                      <TableCell className="text-destructive">
                        {s.lastError?.slice(0, 80) ?? "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Scrape Pipeline */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Scrape Pipeline</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total" value={data.scrape.counts.total} />
          <StatCard label="Pending" value={data.scrape.counts.pending} />
          <StatCard label="Success" value={data.scrape.counts.success} />
          <StatCard label="Failed" value={data.scrape.counts.failed} />
        </div>

        {data.scrape.recentFailures.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Recent Scrape Failures</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Last Scraped</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.scrape.recentFailures.map((f) => (
                    <TableRow key={f.productId}>
                      <TableCell>{f.productTitle}</TableCell>
                      <TableCell className="font-mono text-xs">{f.storeDomain}</TableCell>
                      <TableCell>{formatRelativeTime(f.lastScrapedAt)}</TableCell>
                      <TableCell className="text-destructive">
                        {f.lastError?.slice(0, 80) ?? "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Activity */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Last Hour" value={data.activity.lastHour} />
          <StatCard label="Last 24h" value={data.activity.lastDay} />
        </div>

        {data.activity.byType.length > 0 && (
          <Card size="sm">
            <CardHeader>
              <CardTitle>Events by Type (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Change Type</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.activity.byType.map((e) => (
                    <TableRow key={e.changeType}>
                      <TableCell>{e.changeType}</TableCell>
                      <TableCell>{e.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
