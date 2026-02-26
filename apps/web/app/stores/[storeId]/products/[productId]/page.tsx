"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import type { Variant } from "@webify/db"
import { ChevronRight } from "lucide-react"
import { MediaGallery } from "@/components/product/media-gallery"
import { MediaThumbnailStrip } from "@/components/product/media-thumbnail-strip"
import { ProductHeroInfo } from "@/components/product/product-hero-info"
import { VideoPlayer, type MediaItem } from "@/components/product/video-player"
import { VariantTable } from "@/components/product/variant-table"
import { PriceHistoryChart } from "@/components/product/price-history-chart"
import { ArchivedImagesGrid } from "@/components/product/archived-images-grid"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"
import { useProduct } from "@/hooks/use-product"
import { useArchivedImages } from "@/hooks/use-archived-images"
import { useProductVideos } from "@/hooks/use-product-videos"

export default function ProductDetailPage() {
  const { storeId, productId } = useParams<{ storeId: string; productId: string }>()
  const { data: product, isPending, error } = useProduct(storeId, productId)
  const { images: archivedImages } = useArchivedImages(storeId, product?.id)
  const { videos } = useProductVideos(product?.id)

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxApi, setLightboxApi] = useState<CarouselApi>()

  // ---------- Loading ----------
  if (isPending) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-4 w-48" />

        {/* Asymmetric grid skeleton */}
        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          <div className="col-span-12 lg:col-span-7">
            <Skeleton className="aspect-[4/5] rounded-2xl" />
          </div>
          <div className="col-span-12 space-y-4 lg:col-span-5">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-12 w-40" />
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
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Thumbnail strip skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-14 shrink-0 rounded-xl md:size-16 lg:size-20" />
          ))}
        </div>
      </div>
    )
  }

  // ---------- Error ----------
  if (error || !product) {
    return <p className="text-muted-foreground py-8 text-center">Product not found.</p>
  }

  // ---------- Data ----------
  const activeImages = (product.images ?? [])
    .filter((img) => !img.isRemoved)
    .sort((a, b) => a.position - b.position)

  const activeVideos = videos
    .filter((v) => !v.isRemoved)
    .sort((a, b) => a.position - b.position)

  const media: MediaItem[] = [
    ...activeImages.map((img) => ({
      kind: "image" as const,
      id: img.id,
      url: img.url,
      position: img.position,
    })),
    ...activeVideos.map((v) => ({
      kind: "video" as const,
      id: v.id,
      src: v.src,
      format: v.format,
      position: v.position,
      alt: v.alt,
    })),
  ].sort((a, b) => a.position - b.position)

  const thumbnailData = media.map((item) =>
    item.kind === "image"
      ? { kind: "image" as const, id: item.id, url: item.url }
      : { kind: "video" as const, id: item.id },
  )

  const variants = product.variants ?? []
  const effectiveVariantId = selectedVariantId ?? variants[0]?.id ?? null
  const selectedVariant =
    variants.find((v: Variant) => v.id === effectiveVariantId) ?? null
  const chartVariantId = effectiveVariantId ?? variants[0]?.id

  const hasArchivedImages = archivedImages.length > 0
  const hasVariants = variants.length > 0
  const hasTabs = hasVariants || hasArchivedImages
  const defaultTab = hasVariants ? "variants" : "archived-images"

  function openLightbox() {
    setLightboxOpen(true)
    setTimeout(() => lightboxApi?.scrollTo(selectedMediaIndex, true), 0)
  }

  function onLightboxApiReady(api: CarouselApi) {
    setLightboxApi(api)
    api?.on("select", () => {
      setSelectedMediaIndex(api.selectedScrollSnap())
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Link
          href={`/stores/${storeId}`}
          className="hover:text-foreground transition-colors"
        >
          {product.storeDomain}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground truncate">{product.title}</span>
      </nav>

      {/* Two-column grid: gallery (7) + info sidebar (5) */}
      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-7">
          <MediaGallery
            images={activeImages}
            videos={activeVideos}
            productTitle={product.title}
            selectedIndex={selectedMediaIndex}
            onSelectIndex={setSelectedMediaIndex}
            onOpenLightbox={openLightbox}
          />
        </div>

        <div className="col-span-12 lg:col-span-5">
          <ProductHeroInfo
            product={product}
            variants={variants}
            selectedVariant={selectedVariant}
            selectedVariantId={effectiveVariantId}
            onSelectVariant={setSelectedVariantId}
          />
        </div>
      </div>

      {/* Thumbnail strip */}
      <MediaThumbnailStrip
        media={thumbnailData}
        selectedIndex={selectedMediaIndex}
        onSelect={setSelectedMediaIndex}
      />

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-3xl p-2">
          <Carousel setApi={onLightboxApiReady} opts={{ startIndex: selectedMediaIndex }}>
            <CarouselContent>
              {media.map((item) => (
                <CarouselItem key={`${item.kind}-${item.id}`}>
                  {item.kind === "image" ? (
                    <img
                      src={item.url}
                      alt={product.title}
                      className="w-full rounded-xl object-contain"
                    />
                  ) : (
                    <VideoPlayer item={item} className="rounded-xl" />
                  )}
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </DialogContent>
      </Dialog>

      {/* Tabs: Variants / Price History / Archived Images */}
      {hasTabs && (
        <Tabs defaultValue={defaultTab}>
          <TabsList variant="line">
            {hasVariants && (
              <TabsTrigger value="variants">All Variants</TabsTrigger>
            )}
            {hasVariants && (
              <TabsTrigger value="price-history">Price History</TabsTrigger>
            )}
            {hasArchivedImages && (
              <TabsTrigger value="archived-images" className="gap-1.5">
                Archived Images
                <Badge
                  variant="secondary"
                  className="ml-1 size-5 justify-center rounded-full p-0 text-[10px]"
                >
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
                      variants={variants.map((v) => ({ id: v.id, title: v.title }))}
                      onVariantChange={setSelectedVariantId}
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
        </Tabs>
      )}
    </div>
  )
}
