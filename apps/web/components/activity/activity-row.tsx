"use client"

import {
  TrendingDownIcon,
  TrendingUpIcon,
  PackageCheckIcon,
  PackageXIcon,
  SparklesIcon,
  TrashIcon,
  ImageIcon,
} from "lucide-react"
import { ChangeType } from "@webify/db"
import { cn } from "@/lib/utils"
import type { ChangeEvent } from "@webify/db"

interface ActivityRowProps {
  event: ChangeEvent
  onMarkRead: (id: string) => void
}

const changeTypeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  [ChangeType.priceDropped]: { icon: TrendingDownIcon, label: "Price dropped" },
  [ChangeType.priceIncreased]: { icon: TrendingUpIcon, label: "Price increased" },
  [ChangeType.backInStock]: { icon: PackageCheckIcon, label: "Back in stock" },
  [ChangeType.outOfStock]: { icon: PackageXIcon, label: "Out of stock" },
  [ChangeType.newProduct]: { icon: SparklesIcon, label: "New product" },
  [ChangeType.productRemoved]: { icon: TrashIcon, label: "Product removed" },
  [ChangeType.imagesChanged]: { icon: ImageIcon, label: "Images changed" },
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

function getChangeDescription(event: ChangeEvent): string {
  const config = changeTypeConfig[event.changeType]
  if (!config) return event.changeType

  switch (event.changeType) {
    case ChangeType.priceDropped:
    case ChangeType.priceIncreased:
      if (event.oldValue && event.newValue) {
        return `${config.label}: $${event.oldValue} → $${event.newValue}`
      }
      return config.label
    case ChangeType.backInStock:
    case ChangeType.outOfStock:
      return event.variantTitle
        ? `${config.label} (${event.variantTitle})`
        : config.label
    default:
      return config.label
  }
}

export function ActivityRow({ event, onMarkRead }: ActivityRowProps) {
  const config = changeTypeConfig[event.changeType] ?? {
    icon: SparklesIcon,
    label: event.changeType,
  }
  const Icon = config.icon

  return (
    <button
      onClick={() => !event.isRead && onMarkRead(event.id)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-muted/50",
        !event.isRead && "bg-muted/30",
      )}
    >
      <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-muted-foreground size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", !event.isRead && "font-medium")}>
          {event.productTitle}
        </p>
        <p className="text-muted-foreground text-xs">
          {getChangeDescription(event)}
        </p>
      </div>
      <span className="text-muted-foreground shrink-0 text-xs">
        {formatRelativeTime(event.occurredAt)}
      </span>
    </button>
  )
}
