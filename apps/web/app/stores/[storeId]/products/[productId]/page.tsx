"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import type { Variant } from "@webify/db"
import { Header } from "@/components/layout/header"
import { ImageGallery } from "@/components/product/image-gallery"
import { ProductInfo } from "@/components/product/product-info"
import { VariantTable } from "@/components/product/variant-table"
import { PriceHistoryChart } from "@/components/product/price-history-chart"
import { ArchivedImagesGrid } from "@/components/product/archived-images-grid"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useProduct } from "@/hooks/use-product"
import { useArchivedImages } from "@/hooks/use-archived-images"
import { useProductVideos } from "@/hooks/use-product-videos"

export default function ProductDetailPage() {
  const { storeId, productId } = useParams<{ storeId: string; productId: string }>()
  const { data: product, isPending, error } = useProduct(storeId, productId)
  const { images: archivedImages } = useArchivedImages(storeId, product?.id)
  const { videos } = useProductVideos(product?.id)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[3/4] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-px w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
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

  const activeVideos = videos
    .filter((v) => !v.isRemoved)
    .sort((a, b) => a.position - b.position)

  const variants = product.variants ?? []

  // Auto-select first variant if none selected
  const effectiveVariantId = selectedVariantId ?? variants[0]?.id ?? null
  const selectedVariant =
    variants.find((v: Variant) => v.id === effectiveVariantId) ?? null
  const chartVariantId = effectiveVariantId ?? variants[0]?.id

  const hasArchivedImages = archivedImages.length > 0
  const hasVariants = variants.length > 0
  const hasTabs = hasVariants || hasArchivedImages
  const defaultTab = hasVariants ? "variants" : "archived-images"

  return (
    <div className="space-y-8">
      <Header title={product.title} />

      {/* Two-column: gallery + info */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ImageGallery images={activeImages} videos={activeVideos} productTitle={product.title} />
        <ProductInfo
          product={product}
          variants={variants}
          selectedVariant={selectedVariant}
          selectedVariantId={effectiveVariantId}
          onSelectVariant={setSelectedVariantId}
        />
      </div>

      {/* Tabs: Variants + Price History + Archived Images */}
      {hasTabs && <Tabs defaultValue={defaultTab}>
        <TabsList>
          {hasVariants && (
            <TabsTrigger value="variants">All Variants</TabsTrigger>
          )}
          {hasVariants && (
            <TabsTrigger value="price-history">Price History</TabsTrigger>
          )}
          {hasArchivedImages && (
            <TabsTrigger value="archived-images" className="gap-1.5">
              Archived Images
              <Badge variant="secondary" className="ml-1 size-5 justify-center rounded-full p-0 text-[10px]">
                {archivedImages.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {hasVariants && (
          <TabsContent value="variants">
            <Card>
              <CardContent className="pt-6">
                <VariantTable
                  variants={variants}
                  selectedVariantId={effectiveVariantId}
                  onSelectVariant={setSelectedVariantId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasVariants && (
          <TabsContent value="price-history">
            <Card>
              <CardContent className="pt-6">
                {chartVariantId ? (
                  <PriceHistoryChart
                    productId={product.id}
                    variantId={chartVariantId}
                  />
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No variants available for price history.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasArchivedImages && (
          <TabsContent value="archived-images">
            <Card>
              <CardContent className="pt-6">
                <ArchivedImagesGrid
                  images={archivedImages}
                  productTitle={product.title}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>}
    </div>
  )
}
