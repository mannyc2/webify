import type { SyncStatus as SyncStatusType } from "@webify/db"
import { cn } from "@/lib/utils"

interface SyncStatusProps {
  status: SyncStatusType
  lastFetchedAt?: string | null
  className?: string
}

const statusConfig = {
  pending: { color: "bg-yellow-500", label: "Pending" },
  healthy: { color: "bg-emerald-500", label: "Healthy" },
  failing: { color: "bg-red-500", label: "Failing" },
  stale: { color: "bg-orange-500", label: "Stale" },
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

export function SyncStatus({ status, lastFetchedAt, className }: SyncStatusProps) {
  const config = statusConfig[status]

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className={cn("size-2 rounded-full", config.color)} />
      <span className="text-muted-foreground">
        {config.label}
        {lastFetchedAt && (
          <> &middot; {formatRelativeTime(lastFetchedAt)}</>
        )}
      </span>
    </span>
  )
}
