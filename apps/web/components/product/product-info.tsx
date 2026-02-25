import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StockBadge } from "@/components/shared/stock-badge"
import { VariantPicker } from "@/components/product/variant-picker"
import type { Variant } from "@webify/db"

interface ProductInfoProps {
  product: {
    cachedPrice: string
    cachedIsAvailable: boolean
    vendor: string | null
    productType: string | null
  }
  variants: Variant[]
  selectedVariant: Variant | null
  selectedVariantId: number | null
  onSelectVariant: (id: number) => void
}

export function ProductInfo({
  product,
  variants,
  selectedVariant,
  selectedVariantId,
  onSelectVariant,
}: ProductInfoProps) {
  const price = selectedVariant
    ? parseFloat(selectedVariant.price)
    : parseFloat(product.cachedPrice)
  const compareAt = selectedVariant?.compareAtPrice
    ? parseFloat(selectedVariant.compareAtPrice)
    : null
  const isOnSale = compareAt !== null && compareAt > price
  const percentOff = isOnSale
    ? Math.round(((compareAt - price) / compareAt) * 100)
    : 0
  const available = selectedVariant
    ? selectedVariant.available
    : product.cachedIsAvailable

  return (
    <div className="space-y-4">
      {/* Price */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            ${price.toFixed(2)}
          </span>
          {isOnSale && (
            <>
              <span className="text-muted-foreground text-lg tabular-nums line-through">
                ${compareAt.toFixed(2)}
              </span>
              <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                -{percentOff}%
              </Badge>
            </>
          )}
        </div>
        <div className="mt-2">
          <StockBadge available={available} />
        </div>
      </div>

      <Separator />

      {/* Variant picker */}
      <VariantPicker
        variants={variants}
        selectedVariantId={selectedVariantId}
        onSelectVariant={onSelectVariant}
      />

      <Separator />

      {/* Metadata */}
      <dl className="text-sm space-y-2">
        {product.vendor && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">Vendor</dt>
            <dd>{product.vendor}</dd>
          </div>
        )}
        {product.productType && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">Type</dt>
            <dd>{product.productType}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
