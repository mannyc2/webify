"use client"

import { useMemo } from "react"
import { ActivityIcon } from "lucide-react"
import { ChangeType, ChangeMagnitude } from "@webify/db"
import type { ChangeEvent, Store } from "@webify/db"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { EventCard } from "./event-card"
import { ActivityRow } from "./activity-row"
import { TickerStrip } from "./ticker-strip"
import { sortByMagnitude } from "@/hooks/use-events"
import type { ViewMode } from "./activity-filters"

interface ActivityFeedProps {
  events: ChangeEvent[]
  isLoading: boolean
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

function EventGroupSection({
  group,
  stores,
}: {
  group: EventGroup
  stores: Store[]
}) {
  const largeEvents = group.events.filter(
    (e) => e.magnitude === ChangeMagnitude.large,
  )
  const mediumEvents = group.events.filter(
    (e) => e.magnitude === ChangeMagnitude.medium,
  )
  const smallEvents = group.events.filter(
    (e) => e.magnitude === ChangeMagnitude.small,
  )

  return (
    <div>
      <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {group.label}
      </h3>
      <div className="space-y-1">
        {largeEvents.map((event) => (
          <EventCard key={event.id} event={event} stores={stores} />
        ))}
        {mediumEvents.map((event) => (
          <ActivityRow key={event.id} event={event} />
        ))}
        {smallEvents.length > 0 && <TickerStrip events={smallEvents} />}
      </div>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-2">
      {/* Large card skeleton */}
      <div className="flex items-start gap-4 rounded-xl border-l-4 border-l-muted px-4 py-4">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      {/* Medium row skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
      {/* Ticker skeleton */}
      <div className="rounded-xl bg-muted/30 p-3">
        <Skeleton className="mb-2 h-3 w-24" />
        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1">
              <Skeleton className="size-3.5 rounded" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ActivityFeed({
  events,
  isLoading,
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
    return <FeedSkeleton />
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
        <EventGroupSection key={group.label} group={group} stores={stores} />
      ))}
    </div>
  )
}
