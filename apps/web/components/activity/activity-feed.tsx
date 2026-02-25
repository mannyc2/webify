"use client"

import { useMemo } from "react"
import { ActivityIcon } from "lucide-react"
import { ChangeType } from "@webify/db"
import type { ChangeEvent, Store } from "@webify/db"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { ActivityRow } from "./activity-row"
import { sortByMagnitude } from "@/hooks/use-events"
import type { ViewMode } from "./activity-filters"

interface ActivityFeedProps {
  events: ChangeEvent[]
  isLoading: boolean
  onMarkRead: (id: string) => void
  view: ViewMode
  stores: Store[]
}

interface EventGroup {
  label: string
  events: ChangeEvent[]
}

function groupByDate(events: ChangeEvent[]): EventGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

  const buckets = new Map<string, ChangeEvent[]>()

  for (const event of events) {
    const date = new Date(event.occurredAt)
    let label: string
    if (date >= today) label = "Today"
    else if (date >= yesterday) label = "Yesterday"
    else if (date >= weekAgo) label = "This Week"
    else label = "Older"

    const existing = buckets.get(label)
    if (existing) existing.push(event)
    else buckets.set(label, [event])
  }

  const groups: EventGroup[] = []
  for (const label of ["Today", "Yesterday", "This Week", "Older"]) {
    const items = buckets.get(label)
    if (items?.length) groups.push({ label, events: sortByMagnitude(items) })
  }

  return groups
}

function groupByStore(events: ChangeEvent[], stores: Store[]): EventGroup[] {
  const storeMap = new Map(stores.map((s) => [s.domain, s.name]))
  const buckets = new Map<string, ChangeEvent[]>()

  for (const event of events) {
    const existing = buckets.get(event.storeDomain)
    if (existing) existing.push(event)
    else buckets.set(event.storeDomain, [event])
  }

  return Array.from(buckets.entries())
    .map(([domain, items]) => ({
      label: storeMap.get(domain) ?? domain,
      events: sortByMagnitude(items),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

const TYPE_GROUPS: { label: string; types: string[] }[] = [
  {
    label: "Price Changes",
    types: [ChangeType.priceDropped, ChangeType.priceIncreased],
  },
  {
    label: "Stock Changes",
    types: [ChangeType.backInStock, ChangeType.outOfStock],
  },
  {
    label: "Catalog",
    types: [
      ChangeType.newProduct,
      ChangeType.productRemoved,
      ChangeType.imagesChanged,
    ],
  },
]

function groupByType(events: ChangeEvent[]): EventGroup[] {
  return TYPE_GROUPS.map(({ label, types }) => ({
    label,
    events: sortByMagnitude(events.filter((e) => types.includes(e.changeType))),
  })).filter((g) => g.events.length > 0)
}

function ActivityRowSkeleton({ magnitude = "medium" }: { magnitude?: string }) {
  if (magnitude === "large") {
    return (
      <div className="flex items-start gap-4 rounded-xl border-l-4 border-l-muted px-4 py-4">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    )
  }
  if (magnitude === "small") {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <Skeleton className="size-4 rounded" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-3 w-10" />
      </div>
    )
  }
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

export function ActivityFeed({
  events,
  isLoading,
  onMarkRead,
  view,
  stores,
}: ActivityFeedProps) {
  const groups = useMemo(() => {
    switch (view) {
      case "store":
        return groupByStore(events, stores)
      case "type":
        return groupByType(events)
      default:
        return groupByDate(events)
    }
  }, [events, view, stores])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <ActivityRowSkeleton magnitude="large" />
        {Array.from({ length: 4 }).map((_, i) => (
          <ActivityRowSkeleton key={i} />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <ActivityRowSkeleton key={`sm-${i}`} magnitude="small" />
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
          <EmptyDescription>
            Changes to your monitored stores will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
