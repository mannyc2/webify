"use client"

import { CheckCheckIcon, ShieldAlertIcon, MailIcon } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  majorOnly: boolean
  onMajorOnlyToggle: () => void
  unreadOnly: boolean
  onUnreadOnlyToggle: () => void
  unreadCount: number
  onMarkAllRead: () => void
}

export function ActivityFilters({
  stores,
  view,
  onViewChange,
  activeStores,
  onStoreToggle,
  majorOnly,
  onMajorOnlyToggle,
  unreadOnly,
  onUnreadOnlyToggle,
  unreadCount,
  onMarkAllRead,
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
        {stores.map((store, i) => (
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
          </Button>
        ))}
        <Button
          variant={majorOnly ? "secondary" : "outline"}
          size="xs"
          onClick={onMajorOnlyToggle}
          className={cn("shrink-0", majorOnly && "ring-1 ring-ring/30")}
        >
          <ShieldAlertIcon className="size-3" />
          Major Only
        </Button>
        <Button
          variant={unreadOnly ? "secondary" : "outline"}
          size="xs"
          onClick={onUnreadOnlyToggle}
          className={cn("shrink-0", unreadOnly && "ring-1 ring-ring/30")}
        >
          <MailIcon className="size-3" />
          Unread Only
        </Button>
      </div>

      {/* Right — Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
        <Button
          variant="outline"
          size="xs"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheckIcon className="size-3" />
          Mark All Read
        </Button>
      </div>
    </div>
  )
}
