"use client"

import { useRouter } from "next/navigation"
import {
  TrendingDownIcon,
  TrendingUpIcon,
  PackageCheckIcon,
  PackageXIcon,
  SparklesIcon,
  TrashIcon,
  ImageIcon,
} from "lucide-react"
import { ChangeType, ChangeMagnitude } from "@webify/db"
import type { ChangeEvent } from "@webify/db"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ActivityRowProps {
  event: ChangeEvent
  onMarkRead: (id: string) => void
}

interface ChangeTypeStyle {
  icon: React.ComponentType<{ className?: string }>
  label: string
  iconBg: string
  textColor: string
  borderColor: string
  bgTint: string
}

const changeTypeStyles: Record<string, ChangeTypeStyle> = {
  [ChangeType.priceDropped]: {
    icon: TrendingDownIcon,
    label: "Price dropped",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-l-emerald-500",
    bgTint: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]",
  },
  [ChangeType.priceIncreased]: {
    icon: TrendingUpIcon,
    label: "Price increased",
    iconBg: "bg-red-500/10 dark:bg-red-500/20",
    textColor: "text-red-600 dark:text-red-400",
    borderColor: "border-l-red-500",
    bgTint: "bg-red-500/[0.03] dark:bg-red-500/[0.05]",
  },
  [ChangeType.backInStock]: {
    icon: PackageCheckIcon,
    label: "Back in stock",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-l-emerald-500",
    bgTint: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]",
  },
  [ChangeType.outOfStock]: {
    icon: PackageXIcon,
    label: "Out of stock",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    textColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-l-amber-500",
    bgTint: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
  },
  [ChangeType.newProduct]: {
    icon: SparklesIcon,
    label: "New product",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-l-blue-500",
    bgTint: "bg-blue-500/[0.03] dark:bg-blue-500/[0.05]",
  },
  [ChangeType.productRemoved]: {
    icon: TrashIcon,
    label: "Product removed",
    iconBg: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-l-muted-foreground/30",
    bgTint: "",
  },
  [ChangeType.imagesChanged]: {
    icon: ImageIcon,
    label: "Images changed",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
    textColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-l-violet-500",
    bgTint: "bg-violet-500/[0.03] dark:bg-violet-500/[0.05]",
  },
}

const defaultStyle: ChangeTypeStyle = {
  icon: SparklesIcon,
  label: "Changed",
  iconBg: "bg-muted",
  textColor: "text-muted-foreground",
  borderColor: "border-l-muted-foreground/30",
  bgTint: "",
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

function computePricePercentage(oldValue: string, newValue: string): number | null {
  const oldPrice = parseFloat(oldValue)
  const newPrice = parseFloat(newValue)
  if (!oldPrice || isNaN(oldPrice) || isNaN(newPrice)) return null
  return Math.round(((newPrice - oldPrice) / oldPrice) * 100)
}

function isPriceChange(changeType: string): boolean {
  return (
    changeType === ChangeType.priceDropped ||
    changeType === ChangeType.priceIncreased
  )
}

// --- Large magnitude — "Screaming" ---
function LargeRow({
  event,
  style,
  onClick,
}: {
  event: ChangeEvent
  style: ChangeTypeStyle
  onClick: () => void
}) {
  const Icon = style.icon
  const priceEvent = isPriceChange(event.changeType)
  const percentage =
    priceEvent && event.oldValue && event.newValue
      ? computePricePercentage(event.oldValue, event.newValue)
      : null

  return (
    <button
      onClick={onClick}
      data-magnitude="large"
      className={cn(
        "group flex w-full items-start gap-4 rounded-xl border-l-4 px-4 py-4 text-start transition-all duration-200",
        style.borderColor,
        style.bgTint,
        !event.isRead && "ring-2 ring-primary/20",
        "hover:bg-muted/50 hover:ring-primary/30",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          style.iconBg,
        )}
      >
        <Icon className={cn("size-5", style.textColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold">{event.productTitle}</p>
        <div className="mt-1 flex items-center gap-2">
          {priceEvent && event.oldValue && event.newValue ? (
            <p className="text-sm text-muted-foreground">
              <span className="line-through">${event.oldValue}</span>
              <span className="mx-1.5">→</span>
              <span className="font-semibold text-foreground">
                ${event.newValue}
              </span>
            </p>
          ) : (
            <p className={cn("text-sm", style.textColor)}>
              {style.label}
              {event.variantTitle ? ` · ${event.variantTitle}` : ""}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {priceEvent && percentage !== null ? (
          <span
            className={cn(
              "font-mono text-xl font-bold tabular-nums",
              percentage < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {percentage > 0 ? "+" : ""}
            {percentage}%
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(event.occurredAt)}
        </span>
        {!event.isRead && <span className="size-2 rounded-full bg-primary" />}
      </div>
    </button>
  )
}

// --- Medium magnitude — "Clear" ---
function MediumRow({
  event,
  style,
  onClick,
}: {
  event: ChangeEvent
  style: ChangeTypeStyle
  onClick: () => void
}) {
  const Icon = style.icon
  const priceEvent = isPriceChange(event.changeType)
  const percentage =
    priceEvent && event.oldValue && event.newValue
      ? computePricePercentage(event.oldValue, event.newValue)
      : null

  return (
    <button
      onClick={onClick}
      data-magnitude="medium"
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start transition-all duration-200 hover:bg-muted/50",
        !event.isRead && "bg-muted/30",
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={cn("size-4", style.textColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", !event.isRead && "font-semibold")}>
          {event.productTitle}
        </p>
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
        {!event.isRead && <span className="size-1.5 rounded-full bg-primary" />}
      </div>
    </button>
  )
}

// --- Small magnitude — "Whisper" ---
function SmallRow({
  event,
  style,
  onClick,
}: {
  event: ChangeEvent
  style: ChangeTypeStyle
  onClick: () => void
}) {
  const Icon = style.icon
  const priceEvent = isPriceChange(event.changeType)

  return (
    <button
      onClick={onClick}
      data-magnitude="small"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition-all duration-200 hover:bg-muted/50"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground/60" />
      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {event.productTitle}
        <span className="ml-2 text-xs">
          {priceEvent && event.oldValue && event.newValue
            ? `$${event.oldValue} → $${event.newValue}`
            : style.label}
        </span>
      </p>
      <span className="shrink-0 text-xs text-muted-foreground/60">
        {formatRelativeTime(event.occurredAt)}
      </span>
    </button>
  )
}

export function ActivityRow({ event, onMarkRead }: ActivityRowProps) {
  const router = useRouter()
  const style = changeTypeStyles[event.changeType] ?? defaultStyle

  const handleClick = () => {
    if (!event.isRead) onMarkRead(event.id)
    if (event.productShopifyId) {
      router.push(
        `/stores/${event.storeDomain}/products/${event.productShopifyId}`,
      )
    }
  }

  switch (event.magnitude) {
    case ChangeMagnitude.large:
      return <LargeRow event={event} style={style} onClick={handleClick} />
    case ChangeMagnitude.small:
      return <SmallRow event={event} style={style} onClick={handleClick} />
    default:
      return <MediumRow event={event} style={style} onClick={handleClick} />
  }
}
