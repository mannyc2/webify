"use client"

import { useRouter } from "next/navigation"
import type { ChangeEvent } from "@webify/db"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  changeTypeStyles,
  defaultStyle,
  isPriceChange,
  computePricePercentage,
  formatRelativeTime,
} from "./activity-utils"

interface ActivityRowProps {
  event: ChangeEvent
}

export function ActivityRow({ event }: ActivityRowProps) {
  const router = useRouter()
  const style = changeTypeStyles[event.changeType] ?? defaultStyle
  const Icon = style.icon
  const priceEvent = isPriceChange(event.changeType)
  const percentage =
    priceEvent && event.oldValue && event.newValue
      ? computePricePercentage(event.oldValue, event.newValue)
      : null

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
      data-magnitude="medium"
      className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start transition-all duration-200 hover:bg-muted/50"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={cn("size-4", style.textColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{event.productTitle}</p>
        <p className="text-xs text-muted-foreground">
          {priceEvent && event.oldValue && event.newValue
            ? `$${event.oldValue} → $${event.newValue}`
            : style.label}
          {event.variantTitle ? ` · ${event.variantTitle}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {priceEvent && percentage !== null && (
          <Badge
            variant="outline"
            className={cn(
              "font-mono tabular-nums",
              percentage < 0
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-red-500/30 text-red-600 dark:text-red-400",
            )}
          >
            {percentage > 0 ? "+" : ""}
            {percentage}%
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(event.occurredAt)}
        </span>
      </div>
    </button>
  )
}
