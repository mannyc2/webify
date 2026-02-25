import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PriceBadgeProps {
  price: string
  previousPrice?: string
  className?: string
}

export function PriceBadge({ price, previousPrice, className }: PriceBadgeProps) {
  const current = parseFloat(price)
  const previous = previousPrice ? parseFloat(previousPrice) : undefined

  if (!previous || previous === current) {
    return (
      <span className={cn("font-medium tabular-nums", className)}>
        ${current.toFixed(2)}
      </span>
    )
  }

  const isDropped = current < previous
  const pctChange = Math.abs(((current - previous) / previous) * 100)

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-medium tabular-nums">${current.toFixed(2)}</span>
      <Badge
        variant={isDropped ? "secondary" : "destructive"}
        className={cn(
          "gap-0.5 text-[10px]",
          isDropped && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
        )}
      >
        {isDropped ? (
          <ArrowDownIcon data-icon="inline-start" className="size-3" />
        ) : (
          <ArrowUpIcon data-icon="inline-start" className="size-3" />
        )}
        {pctChange.toFixed(0)}%
      </Badge>
    </span>
  )
}
