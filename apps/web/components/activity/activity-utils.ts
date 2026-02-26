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

export interface ChangeTypeStyle {
  icon: React.ComponentType<{ className?: string }>
  label: string
  iconBg: string
  textColor: string
  borderColor: string
  bgTint: string
}

export const changeTypeStyles: Record<string, ChangeTypeStyle> = {
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

export const defaultStyle: ChangeTypeStyle = {
  icon: SparklesIcon,
  label: "Changed",
  iconBg: "bg-muted",
  textColor: "text-muted-foreground",
  borderColor: "border-l-muted-foreground/30",
  bgTint: "",
}

export function formatRelativeTime(dateStr: string): string {
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

export function computePricePercentage(
  oldValue: string,
  newValue: string,
): number | null {
  const oldPrice = parseFloat(oldValue)
  const newPrice = parseFloat(newValue)
  if (!oldPrice || isNaN(oldPrice) || isNaN(newPrice)) return null
  return Math.round(((newPrice - oldPrice) / oldPrice) * 100)
}

export function isPriceChange(changeType: string): boolean {
  return (
    changeType === ChangeType.priceDropped ||
    changeType === ChangeType.priceIncreased
  )
}
