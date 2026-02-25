import Link from "next/link"
import { ImageIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ArchiveBadge } from "@/components/shared/archive-badge"
import type { ArchivedProduct } from "@/hooks/use-archived-products"

interface ArchivedProductCardProps {
  product: ArchivedProduct
  storeId: string
}

export function ArchivedProductCard({ product, storeId }: ArchivedProductCardProps) {
  return (
    <Link href={`/stores/${storeId}/archived/${product.handle}`} className="block">
      <Card className="transition-shadow hover:ring-2 hover:ring-ring/20">
        <div className="bg-muted relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-t-2xl">
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.title}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="text-muted-foreground size-10" />
          )}
          <div className="absolute top-2 right-2">
            <ArchiveBadge />
          </div>
        </div>
        <CardContent className="space-y-2 pt-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {product.title}
          </h3>
          <div className="flex items-center justify-between">
            {product.rawPrice ? (
              <span className="font-medium tabular-nums">
                {product.rawPrice.startsWith("$") ? product.rawPrice : `$${product.rawPrice}`}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">No price</span>
            )}
            <span className="text-muted-foreground text-xs">
              {product.snapshotCount} snapshot{product.snapshotCount !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
