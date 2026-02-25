import Link from "next/link"
import { ImageIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StockBadge } from "@/components/shared/stock-badge"
import type { Product } from "@webify/db"

interface ProductCardProps {
  product: Product
  storeId: string
  imageUrl?: string
}

export function ProductCard({ product, storeId, imageUrl }: ProductCardProps) {
  return (
    <Link href={`/stores/${storeId}/products/${product.id}`} className="block">
      <Card className="transition-shadow hover:ring-2 hover:ring-ring/20">
        <div className="bg-muted flex aspect-square items-center justify-center overflow-hidden rounded-t-2xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="text-muted-foreground size-10" />
          )}
        </div>
        <CardContent className="space-y-2 pt-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {product.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="font-medium tabular-nums">
              ${parseFloat(product.cachedPrice).toFixed(2)}
            </span>
            <StockBadge available={product.cachedIsAvailable} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
