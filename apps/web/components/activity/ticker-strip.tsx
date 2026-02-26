"use client"

import { useRouter } from "next/navigation"
import type { ChangeEvent } from "@webify/db"
import { cn } from "@/lib/utils"
import {
  changeTypeStyles,
  defaultStyle,
  isPriceChange,
  formatRelativeTime,
} from "./activity-utils"

interface TickerStripProps {
  events: ChangeEvent[]
}

function TickerEntry({ event }: { event: ChangeEvent }) {
  const router = useRouter()
  const style = changeTypeStyles[event.changeType] ?? defaultStyle
  const Icon = style.icon
  const priceEvent = isPriceChange(event.changeType)

  const changeLabel =
    priceEvent && event.oldValue && event.newValue
      ? `$${event.oldValue}→$${event.newValue}`
      : style.label

  const handleClick = () => {
    if (event.productShopifyId) {
      router.push(
        `/stores/${event.storeDomain}/products/${event.productShopifyId}`,
      )
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-start transition-colors hover:bg-muted/50"
    >
      <Icon className={cn("size-3.5 shrink-0", style.textColor)} />
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        {event.productTitle}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground/80">
        {changeLabel}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground/60">
        {formatRelativeTime(event.occurredAt)}
      </span>
    </button>
  )
}

export function TickerStrip({ events }: TickerStripProps) {
  if (events.length === 0) return null

  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {events.length} minor change{events.length !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-1 gap-0.5 md:grid-cols-2">
        {events.map((event) => (
          <TickerEntry key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
