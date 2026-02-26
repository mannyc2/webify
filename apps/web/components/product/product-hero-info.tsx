"use client"

import type { Variant } from "@webify/db"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StockBadge } from "@/components/shared/stock-badge"
import { VariantPicker } from "@/components/product/variant-picker"
import { PriceSparkline } from "@/components/product/price-sparkline"
import { ProductMetadata } from "@/components/product/product-metadata"

interface ProductHeroInfoProps {
  product: {
    id: number
    title: string
    vendor: string | null
    productType: string | null
    cachedPrice: string
    cachedIsAvailable: boolean
    firstSeenAt: string
    shopifyPublishedAt: string | null
    shopifyUpdatedAt: string | null
  }
  variants: Variant[]
  selectedVariant: Variant | null
  selectedVariantId: number | null
  onSelectVariant: (id: number) => void
}

export function ProductHeroInfo({
  product,
  variants,
  selectedVariant,
  selectedVariantId,
  onSelectVariant,
}: ProductHeroInfoProps) {
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

  const subtitle = [product.vendor, product.productType]
    .filter(Boolean)
    .join(" \u00b7 ")

  const sparklineVariantId = selectedVariantId ?? variants[0]?.id

  return (
    <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
          {product.title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        )}
      </div>

      <Separator />

      {/* Price + Stock + Sparkline */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums tracking-tight lg:text-4xl">
            ${price.toFixed(2)}
          </span>
          {isOnSale && (
            <>
              <span className="text-muted-foreground text-lg tabular-nums line-through">
                ${compareAt.toFixed(2)}
              </span>
              <Badge
                variant="secondary"
                className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
              >
                -{percentOff}%
              </Badge>
            </>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <StockBadge available={available} />
          {sparklineVariantId && (
            <PriceSparkline
              productId={product.id}
              variantId={sparklineVariantId}
            />
          )}
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
      <ProductMetadata
        firstSeenAt={product.firstSeenAt}
        shopifyPublishedAt={product.shopifyPublishedAt}
        shopifyUpdatedAt={product.shopifyUpdatedAt}
      />
    </div>
  )
}
