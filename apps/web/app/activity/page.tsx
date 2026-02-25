"use client"

import { useState, useMemo } from "react"
import { ChangeType, ChangeMagnitude } from "@webify/db"
import { ActivityHero } from "@/components/activity/activity-hero"
import { ActivityFilters, type ViewMode } from "@/components/activity/activity-filters"
import { ActivityFeed } from "@/components/activity/activity-feed"
import { useEvents } from "@/hooks/use-events"
import { useStores } from "@/hooks/use-stores"

export default function ActivityPage() {
  const [view, setView] = useState<ViewMode>("timeline")
  const [activeStores, setActiveStores] = useState<Set<string>>(new Set())
  const [majorOnly, setMajorOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [quickFilter, setQuickFilter] = useState<string | null>(null)

  const { stores } = useStores()
  const { events, summary, isLoading, markRead, markAllRead } = useEvents()

  const filteredEvents = useMemo(() => {
    let result = events

    if (activeStores.size > 0) {
      result = result.filter((e) => activeStores.has(e.storeDomain))
    }
    if (majorOnly) {
      result = result.filter((e) => e.magnitude === ChangeMagnitude.large)
    }
    if (unreadOnly) {
      result = result.filter((e) => !e.isRead)
    }
    if (quickFilter) {
      switch (quickFilter) {
        case "unread":
          result = result.filter((e) => !e.isRead)
          break
        case "priceDrops":
          result = result.filter(
            (e) => e.changeType === ChangeType.priceDropped,
          )
          break
        case "stockChanges":
          result = result.filter(
            (e) =>
              e.changeType === ChangeType.backInStock ||
              e.changeType === ChangeType.outOfStock,
          )
          break
        case "newProducts":
          result = result.filter(
            (e) => e.changeType === ChangeType.newProduct,
          )
          break
      }
    }

    return result
  }, [events, activeStores, majorOnly, unreadOnly, quickFilter])

  const unreadIds = events.filter((e) => !e.isRead).map((e) => e.id)

  const handleStoreToggle = (domain: string) => {
    setActiveStores((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <ActivityHero
        headline={summary.headline}
        summary={summary}
        stores={stores}
        onQuickFilter={setQuickFilter}
        activeQuickFilter={quickFilter}
      />
      <ActivityFilters
        stores={stores}
        view={view}
        onViewChange={setView}
        activeStores={activeStores}
        onStoreToggle={handleStoreToggle}
        majorOnly={majorOnly}
        onMajorOnlyToggle={() => setMajorOnly((v) => !v)}
        unreadOnly={unreadOnly}
        onUnreadOnlyToggle={() => setUnreadOnly((v) => !v)}
        unreadCount={summary.unreadCount}
        onMarkAllRead={() => unreadIds.length > 0 && markAllRead(unreadIds)}
      />
      <ActivityFeed
        events={filteredEvents}
        isLoading={isLoading}
        onMarkRead={markRead}
        view={view}
        stores={stores}
      />
    </div>
  )
}
