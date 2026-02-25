"use client"

import { use } from "react"
import { ImageIcon } from "lucide-react"
import type { Variant } from "@webify/db"
import { Header } from "@/components/layout/header"
import { StockBadge } from "@/components/shared/stock-badge"
import { VariantRow } from "@/components/product/variant-row"
import { PriceHistoryChart } from "@/components/product/price-history-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useProduct } from "@/hooks/use-product"

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ storeId: string; productId: string }>
}) {
  const { storeId, productId } = use(params)
  const { data: product, isPending, error } = useProduct(storeId, productId)

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return <p className="text-muted-foreground py-8 text-center">Product not found.</p>
  }

  const activeImages = (product.images ?? [])
    .filter((img) => !img.isRemoved)
    .sort((a, b) => a.position - b.position)
  const [primaryImage, ...thumbnailImages] = activeImages
  const firstVariant = product.variants?.[0]

  return (
    <div className="space-y-8">
      <Header title={product.title} />

      {/* Images + Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden rounded-2xl">
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt={product.title}
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon className="text-muted-foreground size-16" />
            )}
          </div>
          {thumbnailImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {thumbnailImages.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  loading="lazy"
                  className="bg-muted size-16 shrink-0 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-4">
          <div>
            <span className="text-3xl font-semibold tabular-nums">
              ${parseFloat(product.cachedPrice).toFixed(2)}
            </span>
            <div className="mt-2">
              <StockBadge available={product.cachedIsAvailable} />
            </div>
          </div>
          <dl className="text-sm space-y-2">
            {product.vendor && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-20 shrink-0">Vendor</dt>
                <dd>{product.vendor}</dd>
              </div>
            )}
            {product.productType && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-20 shrink-0">Type</dt>
                <dd>{product.productType}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Variants */}
      {product.variants && product.variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b text-start">
                    <th className="py-2 pe-4 text-start font-medium">Title</th>
                    <th className="py-2 pe-4 text-start font-medium">SKU</th>
                    <th className="py-2 pe-4 text-start font-medium">Price</th>
                    <th className="py-2 pe-4 text-start font-medium">Compare At</th>
                    <th className="py-2 text-start font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant: Variant) => (
                    <VariantRow key={variant.id} variant={variant} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price History */}
      {firstVariant && (
        <Card>
          <CardHeader>
            <CardTitle>Price History</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceHistoryChart
              productId={product.id}
              variantId={firstVariant.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
