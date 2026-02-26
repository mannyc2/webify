"use client"

import { ShieldAlertIcon } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Store } from "@webify/db"

export type ViewMode = "timeline" | "store" | "type"

const STORE_DOT_COLORS = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-red-500",
]

interface ActivityFiltersProps {
  stores: Store[]
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  activeStores: Set<string>
  onStoreToggle: (domain: string) => void
  storeEventCounts: Map<string, number>
  majorOnly: boolean
  onMajorOnlyToggle: () => void
  activeChangeTypes: Set<string>
  onChangeTypeToggle: (type: string) => void
  changeTypeCounts: Record<string, number>
}

const CHANGE_TYPE_CHIPS: {
  key: string
  label: string
  dotColor: string
}[] = [
  { key: "priceDrops", label: "Price Drops", dotColor: "bg-emerald-500" },
  { key: "stockChanges", label: "Stock", dotColor: "bg-amber-500" },
  { key: "newProducts", label: "New", dotColor: "bg-blue-500" },
]

export function ActivityFilters({
  stores,
  view,
  onViewChange,
  activeStores,
  onStoreToggle,
  storeEventCounts,
  majorOnly,
  onMajorOnlyToggle,
  activeChangeTypes,
  onChangeTypeToggle,
  changeTypeCounts,
}: ActivityFiltersProps) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/80 py-2.5 backdrop-blur-sm md:flex-nowrap md:gap-4">
      {/* Left — View Tabs */}
      <Tabs
        value={view}
        onValueChange={(v) => onViewChange(v as ViewMode)}
        className="shrink-0"
      >
        <TabsList variant="line">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="store">By Store</TabsTrigger>
          <TabsTrigger value="type">By Type</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Center — Filter Chips */}
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
        {stores.map((store, i) => {
          const count = storeEventCounts.get(store.domain) ?? 0
          return (
            <Button
              key={store.domain}
              variant={activeStores.has(store.domain) ? "secondary" : "outline"}
              size="xs"
              onClick={() => onStoreToggle(store.domain)}
              className={cn(
                "shrink-0",
                activeStores.has(store.domain) && "ring-1 ring-ring/30",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  STORE_DOT_COLORS[i % STORE_DOT_COLORS.length],
                )}
              />
              {store.name}
              {count > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {count}
                </span>
              )}
            </Button>
          )
        })}

        <div className="mx-1 h-4 w-px bg-border" />

        {CHANGE_TYPE_CHIPS.map(({ key, label, dotColor }) => {
          const count = changeTypeCounts[key] ?? 0
          return (
            <Button
              key={key}
              variant={activeChangeTypes.has(key) ? "secondary" : "outline"}
              size="xs"
              onClick={() => onChangeTypeToggle(key)}
              className={cn(
                "shrink-0",
                activeChangeTypes.has(key) && "ring-1 ring-ring/30",
              )}
            >
              <span className={cn("size-1.5 rounded-full", dotColor)} />
              {label}
              {count > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {count}
                </span>
              )}
            </Button>
          )
        })}

        <Button
          variant={majorOnly ? "secondary" : "outline"}
          size="xs"
          onClick={onMajorOnlyToggle}
          className={cn("shrink-0", majorOnly && "ring-1 ring-ring/30")}
        >
          <ShieldAlertIcon className="size-3" />
          Major Only
        </Button>
      </div>
    </div>
  )
}
