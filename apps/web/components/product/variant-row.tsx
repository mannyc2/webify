import { StockBadge } from "@/components/shared/stock-badge"
import type { Variant } from "@webify/db"

interface VariantRowProps {
  variant: Variant
}

export function VariantRow({ variant }: VariantRowProps) {
  return (
    <tr className="border-border border-b last:border-0">
      <td className="py-3 pe-4 font-medium">{variant.title}</td>
      <td className="text-muted-foreground py-3 pe-4 text-sm">
        {variant.sku ?? "--"}
      </td>
      <td className="py-3 pe-4 tabular-nums">
        ${parseFloat(variant.price).toFixed(2)}
      </td>
      <td className="text-muted-foreground py-3 pe-4 tabular-nums">
        {variant.compareAtPrice ? (
          <span className="line-through">
            ${parseFloat(variant.compareAtPrice).toFixed(2)}
          </span>
        ) : (
          "--"
        )}
      </td>
      <td className="py-3">
        <StockBadge available={variant.available} />
      </td>
    </tr>
  )
}
