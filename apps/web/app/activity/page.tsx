"use client"

import { useState, useMemo } from "react"
import { ChangeType, ChangeMagnitude } from "@webify/db"
import { MarketPulse } from "@/components/activity/market-pulse"
import { ActivityFilters, type ViewMode } from "@/components/activity/activity-filters"
import { ActivityFeed } from "@/components/activity/activity-feed"
import { useEvents } from "@/hooks/use-events"
import { useStores } from "@/hooks/use-stores"

export default function ActivityPage() {
  const [view, setView] = useState<ViewMode>("timeline")
  const [activeStores, setActiveStores] = useState<Set<string>>(new Set())
  const [majorOnly, setMajorOnly] = useState(false)
  const [activeChangeTypes, setActiveChangeTypes] = useState<Set<string>>(
    new Set(),
  )
  const [quickFilter, setQuickFilter] = useState<string | null>(null)

  const { stores } = useStores()
  const { events, summary, isLoading } = useEvents()

  const storeEventCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of events) {
      counts.set(e.storeDomain, (counts.get(e.storeDomain) ?? 0) + 1)
    }
    return counts
  }, [events])

  const changeTypeCounts = useMemo(() => {
    let priceDrops = 0
    let stockChanges = 0
    let newProducts = 0
    for (const e of events) {
      if (e.changeType === ChangeType.priceDropped) priceDrops++
      else if (
        e.changeType === ChangeType.backInStock ||
        e.changeType === ChangeType.outOfStock
      )
        stockChanges++
      else if (e.changeType === ChangeType.newProduct) newProducts++
    }
    return { priceDrops, stockChanges, newProducts }
  }, [events])

  const filteredEvents = useMemo(() => {
    let result = events

    if (activeStores.size > 0) {
      result = result.filter((e) => activeStores.has(e.storeDomain))
    }
    if (majorOnly) {
      result = result.filter((e) => e.magnitude === ChangeMagnitude.large)
    }

    // Change type multi-select filter
    if (activeChangeTypes.size > 0) {
      result = result.filter((e) => {
        if (activeChangeTypes.has("priceDrops") && e.changeType === ChangeType.priceDropped) return true
        if (
          activeChangeTypes.has("stockChanges") &&
          (e.changeType === ChangeType.backInStock || e.changeType === ChangeType.outOfStock)
        ) return true
        if (activeChangeTypes.has("newProducts") && e.changeType === ChangeType.newProduct) return true
        return false
      })
    }

    // Quick filter from stat block clicks
    if (quickFilter) {
      switch (quickFilter) {
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
  }, [events, activeStores, majorOnly, activeChangeTypes, quickFilter])

  const handleStoreToggle = (domain: string) => {
    setActiveStores((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  const handleChangeTypeToggle = (type: string) => {
    setActiveChangeTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <MarketPulse
        summary={summary}
        events={events}
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
        storeEventCounts={storeEventCounts}
        majorOnly={majorOnly}
        onMajorOnlyToggle={() => setMajorOnly((v) => !v)}
        activeChangeTypes={activeChangeTypes}
        onChangeTypeToggle={handleChangeTypeToggle}
        changeTypeCounts={changeTypeCounts}
      />
      <ActivityFeed
        events={filteredEvents}
        isLoading={isLoading}
        view={view}
        stores={stores}
      />
    </div>
  )
}
