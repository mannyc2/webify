"use client"

import {
  CheckCircleIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  PackageCheckIcon,
  PackageXIcon,
  SparklesIcon,
  TrashIcon,
  ImageIcon,
} from "lucide-react"
import { ChangeType } from "@webify/db"
import type { ChangeEvent, Store } from "@webify/db"
import type { EventSummary } from "@/hooks/use-events"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const changeTypeIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  [ChangeType.priceDropped]: TrendingDownIcon,
  [ChangeType.priceIncreased]: TrendingUpIcon,
  [ChangeType.backInStock]: PackageCheckIcon,
  [ChangeType.outOfStock]: PackageXIcon,
  [ChangeType.newProduct]: SparklesIcon,
  [ChangeType.productRemoved]: TrashIcon,
  [ChangeType.imagesChanged]: ImageIcon,
}

const changeTypeLabels: Record<string, string> = {
  [ChangeType.priceDropped]: "Price dropped",
  [ChangeType.priceIncreased]: "Price increased",
  [ChangeType.backInStock]: "Back in stock",
  [ChangeType.outOfStock]: "Out of stock",
  [ChangeType.newProduct]: "New product",
  [ChangeType.productRemoved]: "Product removed",
  [ChangeType.imagesChanged]: "Images changed",
}

const changeTypeIconStyle: Record<string, string> = {
  [ChangeType.priceDropped]:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  [ChangeType.priceIncreased]:
    "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  [ChangeType.backInStock]:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  [ChangeType.outOfStock]:
    "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  [ChangeType.newProduct]:
    "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  [ChangeType.productRemoved]: "bg-muted text-muted-foreground",
  [ChangeType.imagesChanged]:
    "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
}

function isPriceChange(changeType: string): boolean {
  return (
    changeType === ChangeType.priceDropped ||
    changeType === ChangeType.priceIncreased
  )
}

function computePercentage(
  oldValue: string,
  newValue: string,
): number | null {
  const old = parseFloat(oldValue)
  const nu = parseFloat(newValue)
  if (!old || isNaN(old) || isNaN(nu)) return null
  return Math.round(((nu - old) / old) * 100)
}

interface ActivityHeroProps {
  headline: ChangeEvent | null
  summary: EventSummary
  stores: Store[]
  onQuickFilter: (filter: string | null) => void
  activeQuickFilter: string | null
}

function HeadlineEvent({
  event,
  stores,
}: {
  event: ChangeEvent
  stores: Store[]
}) {
  const storeName =
    stores.find((s) => s.domain === event.storeDomain)?.name ??
    event.storeDomain
  const priceEvent = isPriceChange(event.changeType)
  const percentage =
    priceEvent && event.oldValue && event.newValue
      ? computePercentage(event.oldValue, event.newValue)
      : null
  const Icon = changeTypeIcons[event.changeType] ?? SparklesIcon
  const label = changeTypeLabels[event.changeType] ?? event.changeType

  return (
    <div className="flex-1 space-y-3">
      <Badge variant="outline">{storeName}</Badge>
      <h2 className="text-2xl font-semibold leading-tight">
        {event.productTitle}
      </h2>
      {priceEvent && percentage !== null && event.oldValue && event.newValue ? (
        <div className="flex items-baseline gap-3">
          <span
            className={cn(
              "font-mono text-5xl font-black tabular-nums",
              percentage < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {percentage > 0 ? "+" : ""}
            {percentage}%
          </span>
          <div className="text-lg">
            <span className="text-muted-foreground line-through">
              ${event.oldValue}
            </span>
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="font-semibold">${event.newValue}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl",
              changeTypeIconStyle[event.changeType] ??
                "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-6" />
          </div>
          <span className="text-2xl font-medium">{label}</span>
        </div>
      )}
    </div>
  )
}

function AllCaughtUp() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <CheckCircleIcon className="mb-3 size-10 text-emerald-500" />
      <h2 className="text-xl font-semibold">All caught up</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        No unread changes.
      </p>
    </div>
  )
}

interface StatCardProps {
  label: string
  count: number
  borderColor: string
  active: boolean
  onClick: () => void
}

function StatCard({
  label,
  count,
  borderColor,
  active,
  onClick,
}: StatCardProps) {
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
    </button>
  )
}

export function ActivityHero({
  headline,
  summary,
  stores,
  onQuickFilter,
  activeQuickFilter,
}: ActivityHeroProps) {
  const priceDropCount = (summary.todayCounts[ChangeType.priceDropped] ?? 0) as number
  const stockChangeCount =
    ((summary.todayCounts[ChangeType.backInStock] ?? 0) +
      (summary.todayCounts[ChangeType.outOfStock] ?? 0)) as number
  const newProductCount = (summary.todayCounts[ChangeType.newProduct] ?? 0) as number

  const toggle = (filter: string) => {
    onQuickFilter(activeQuickFilter === filter ? null : filter)
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
      {headline ? (
        <HeadlineEvent event={headline} stores={stores} />
      ) : (
        <AllCaughtUp />
      )}
      <div className="grid w-full grid-cols-2 gap-2 md:w-64 md:shrink-0">
        <StatCard
          label="Unread"
          count={summary.unreadCount}
          borderColor="border-l-primary"
          active={activeQuickFilter === "unread"}
          onClick={() => toggle("unread")}
        />
        <StatCard
          label="Price Drops"
          count={priceDropCount}
          borderColor="border-l-emerald-500"
          active={activeQuickFilter === "priceDrops"}
          onClick={() => toggle("priceDrops")}
        />
        <StatCard
          label="Stock"
          count={stockChangeCount}
          borderColor="border-l-amber-500"
          active={activeQuickFilter === "stockChanges"}
          onClick={() => toggle("stockChanges")}
        />
        <StatCard
          label="New"
          count={newProductCount}
          borderColor="border-l-blue-500"
          active={activeQuickFilter === "newProducts"}
          onClick={() => toggle("newProducts")}
        />
      </div>
    </div>
  )
}
