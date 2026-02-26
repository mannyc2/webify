"use client"

import { ChangeType } from "@webify/db"
import type { ChangeEvent, Store } from "@webify/db"
import type { EventSummary } from "@/hooks/use-events"
import { cn } from "@/lib/utils"
import {
  isPriceChange,
  computePricePercentage,
} from "./activity-utils"

interface MarketPulseProps {
  summary: EventSummary
  events: ChangeEvent[]
  stores: Store[]
  onQuickFilter: (filter: string | null) => void
  activeQuickFilter: string | null
}

interface StatBlockProps {
  label: string
  count: number
  subtitle?: string
  borderColor: string
  active: boolean
  onClick: () => void
}

function StatBlock({
  label,
  count,
  subtitle,
  borderColor,
  active,
  onClick,
}: StatBlockProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border-l-4 px-3 py-2 text-start transition-colors hover:bg-muted/50",
        borderColor,
        active && "bg-muted/50 ring-1 ring-ring/20",
      )}
    >
      <span className="font-mono text-2xl font-semibold tabular-nums">
        {count}
      </span>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground/70">{subtitle}</span>
      )}
    </button>
  )
}

function BiggestMover({ events }: { events: ChangeEvent[] }) {
  let biggest: ChangeEvent | null = null
  let biggestPct = 0

  for (const event of events) {
    if (!isPriceChange(event.changeType)) continue
    if (!event.oldValue || !event.newValue) continue
    const pct = computePricePercentage(event.oldValue, event.newValue)
    if (pct !== null && Math.abs(pct) > Math.abs(biggestPct)) {
      biggest = event
      biggestPct = pct
    }
  }

  if (!biggest || biggestPct === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Biggest Mover
      </span>
      <span className="truncate text-sm font-medium">
        {biggest.productTitle}
      </span>
      <span
        className={cn(
          "ml-auto shrink-0 font-mono text-lg font-bold tabular-nums",
          biggestPct < 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400",
        )}
      >
        {biggestPct > 0 ? "+" : ""}
        {biggestPct}%
      </span>
    </div>
  )
}

export function MarketPulse({
  summary,
  events,
  stores: _stores,
  onQuickFilter,
  activeQuickFilter,
}: MarketPulseProps) {
  const totalToday = Object.values(summary.todayCounts).reduce(
    (sum, n) => sum + (n ?? 0),
    0,
  )
  const priceDropCount =
    (summary.todayCounts[ChangeType.priceDropped] ?? 0) as number
  const stockChangeCount =
    ((summary.todayCounts[ChangeType.backInStock] ?? 0) +
      (summary.todayCounts[ChangeType.outOfStock] ?? 0)) as number
  const newProductCount =
    (summary.todayCounts[ChangeType.newProduct] ?? 0) as number

  const priceDropStoreCount = new Set(
    events
      .filter((e) => e.changeType === ChangeType.priceDropped)
      .map((e) => e.storeDomain),
  ).size

  const toggle = (filter: string) => {
    onQuickFilter(activeQuickFilter === filter ? null : filter)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Market Pulse
        </h1>
        <p className="text-sm text-muted-foreground">
          {totalToday} changes
          {priceDropCount > 0 && ` · ${priceDropCount} price drops`}
          {stockChangeCount > 0 && ` · ${stockChangeCount} stock`}
          {newProductCount > 0 && ` · ${newProductCount} new`}
        </p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          <StatBlock
            label="Total"
            count={totalToday}
            borderColor="border-l-primary"
            active={activeQuickFilter === "total"}
            onClick={() => toggle("total")}
          />
          <StatBlock
            label="Price Drops"
            count={priceDropCount}
            subtitle={
              priceDropStoreCount > 0
                ? `across ${priceDropStoreCount} store${priceDropStoreCount !== 1 ? "s" : ""}`
                : undefined
            }
            borderColor="border-l-emerald-500"
            active={activeQuickFilter === "priceDrops"}
            onClick={() => toggle("priceDrops")}
          />
          <StatBlock
            label="Stock"
            count={stockChangeCount}
            borderColor="border-l-amber-500"
            active={activeQuickFilter === "stockChanges"}
            onClick={() => toggle("stockChanges")}
          />
          <StatBlock
            label="New"
            count={newProductCount}
            borderColor="border-l-blue-500"
            active={activeQuickFilter === "newProducts"}
            onClick={() => toggle("newProducts")}
          />
        </div>
        <div className="md:w-64 md:shrink-0">
          <BiggestMover events={events} />
        </div>
      </div>
    </div>
  )
}
