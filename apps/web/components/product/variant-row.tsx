import { StockBadge } from "@/components/shared/stock-badge"
import { TableRow, TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Variant } from "@webify/db"

interface VariantRowProps {
  variant: Variant
  isSelected?: boolean
  onSelect?: (id: number) => void
}

export function VariantRow({ variant, isSelected, onSelect }: VariantRowProps) {
  return (
    <TableRow
      className={cn(
        onSelect && "cursor-pointer",
        isSelected && "bg-muted",
      )}
      onClick={() => onSelect?.(variant.id)}
    >
      <TableCell className="font-medium">{variant.title}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {variant.sku ?? "--"}
      </TableCell>
      <TableCell className="tabular-nums">
        ${parseFloat(variant.price).toFixed(2)}
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {variant.compareAtPrice ? (
          <span className="line-through">
            ${parseFloat(variant.compareAtPrice).toFixed(2)}
          </span>
        ) : (
          "--"
        )}
      </TableCell>
      <TableCell>
        <StockBadge available={variant.available} />
      </TableCell>
    </TableRow>
  )
}
