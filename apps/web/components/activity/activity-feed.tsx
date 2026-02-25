"use client"

import { ActivityIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { ActivityRow } from "./activity-row"
import type { ChangeEvent } from "@webify/db"

interface ActivityFeedProps {
  events: ChangeEvent[]
  isLoading: boolean
  onMarkRead: (id: string) => void
}

function groupByDate(events: ChangeEvent[]) {
  const groups: { label: string; events: ChangeEvent[] }[] = []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

  const buckets = new Map<string, ChangeEvent[]>()

  for (const event of events) {
    const date = new Date(event.occurredAt)
    let label: string
    if (date >= today) {
      label = "Today"
    } else if (date >= yesterday) {
      label = "Yesterday"
    } else if (date >= weekAgo) {
      label = "This Week"
    } else {
      label = "Older"
    }
    const existing = buckets.get(label)
    if (existing) {
      existing.push(event)
    } else {
      buckets.set(label, [event])
    }
  }

  for (const label of ["Today", "Yesterday", "This Week", "Older"]) {
    const events = buckets.get(label)
    if (events?.length) {
      groups.push({ label, events })
    }
  }

  return groups
}

function ActivityRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <Skeleton className="size-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  )
}

export function ActivityFeed({ events, isLoading, onMarkRead }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ActivityRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ActivityIcon />
          </EmptyMedia>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>Changes to your monitored stores will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const groups = groupByDate(events)

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-muted-foreground mb-2 px-3 text-xs font-medium uppercase tracking-wider">
            {group.label}
          </h3>
          <div className="space-y-0.5">
            {group.events.map((event) => (
              <ActivityRow
                key={event.id}
                event={event}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
