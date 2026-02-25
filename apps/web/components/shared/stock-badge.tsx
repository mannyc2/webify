import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StockBadgeProps {
  available: boolean
  className?: string
}

export function StockBadge({ available, className }: StockBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        available
          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
        className,
      )}
    >
      {available ? "In Stock" : "Out of Stock"}
    </Badge>
  )
}
