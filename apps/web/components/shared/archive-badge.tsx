import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ArchiveBadgeProps {
  className?: string
}

export function ArchiveBadge({ className }: ArchiveBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
        className,
      )}
    >
      Archived
    </Badge>
  )
}
