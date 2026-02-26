"use client"

import { useRouter } from "next/navigation"
import type { ChangeEvent, Store } from "@webify/db"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  changeTypeStyles,
  defaultStyle,
  isPriceChange,
  computePricePercentage,
  formatRelativeTime,
} from "./activity-utils"

interface EventCardProps {
  event: ChangeEvent
  stores: Store[]
}

export function EventCard({ event, stores }: EventCardProps) {
  const router = useRouter()
  const style = changeTypeStyles[event.changeType] ?? defaultStyle
  const Icon = style.icon
  const priceEvent = isPriceChange(event.changeType)
  const percentage =
    priceEvent && event.oldValue && event.newValue
      ? computePricePercentage(event.oldValue, event.newValue)
      : null
  const storeName =
    stores.find((s) => s.domain === event.storeDomain)?.name ??
    event.storeDomain

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
      className={cn(
        "group flex w-full flex-col gap-3 rounded-xl border-l-4 px-4 py-4 text-start transition-all duration-200",
        style.borderColor,
        style.bgTint,
        "hover:bg-muted/50",
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div
          className={cn(
            "flex size-5 items-center justify-center rounded",
            style.iconBg,
          )}
        >
          <Icon className={cn("size-3", style.textColor)} />
        </div>
        <span className={style.textColor}>{style.label}</span>
        <span>·</span>
        <span>{formatRelativeTime(event.occurredAt)}</span>
      </div>
      <h3 className="text-base font-semibold leading-tight">
        {event.productTitle}
      </h3>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="shrink-0">
          {storeName}
        </Badge>
        {priceEvent && event.oldValue && event.newValue ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">
              <span className="line-through">${event.oldValue}</span>
              <span className="mx-1.5">→</span>
              <span className="font-semibold text-foreground">
                ${event.newValue}
              </span>
            </span>
            {percentage !== null && (
              <span
                className={cn(
                  "font-mono text-2xl font-bold tabular-nums",
                  percentage < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {percentage > 0 ? "+" : ""}
                {percentage}%
              </span>
            )}
          </div>
        ) : (
          event.variantTitle && (
            <span className="text-sm text-muted-foreground">
              {event.variantTitle}
            </span>
          )
        )}
      </div>
    </button>
  )
}
