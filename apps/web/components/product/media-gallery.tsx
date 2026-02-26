"use client"

import { useMemo, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import { VideoPlayer, type MediaItem } from "@/components/product/video-player"
import type { ProductVideo } from "@/hooks/use-product-videos"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"

interface ProductImage {
  id: number
  url: string
  position: number
}

interface MediaGalleryProps {
  images: ProductImage[]
  videos?: ProductVideo[]
  productTitle: string
  selectedIndex: number
  onSelectIndex: (index: number) => void
  onOpenLightbox: () => void
}

export function MediaGallery({
  images,
  videos = [],
  productTitle,
  selectedIndex,
  onSelectIndex,
  onOpenLightbox,
}: MediaGalleryProps) {
  const [emblaApi, setEmblaApi] = useState<CarouselApi>()

  const media = useMemo<MediaItem[]>(() => {
    const imageItems: MediaItem[] = images.map((img) => ({
      kind: "image",
      id: img.id,
      url: img.url,
      position: img.position,
    }))
    const videoItems: MediaItem[] = videos.map((v) => ({
      kind: "video",
      id: v.id,
      src: v.src,
      format: v.format,
      position: v.position,
      alt: v.alt,
    }))
    return [...imageItems, ...videoItems].sort((a, b) => a.position - b.position)
  }, [images, videos])

  const onApiReady = useCallback(
    (api: CarouselApi) => {
      setEmblaApi(api)
      api?.on("select", () => {
        onSelectIndex(api.selectedScrollSnap())
      })
    },
    [onSelectIndex],
  )

  const heroItem = media[selectedIndex]

  function goPrev() {
    const next = (selectedIndex - 1 + media.length) % media.length
    onSelectIndex(next)
    emblaApi?.scrollTo(next)
  }

  function goNext() {
    const next = (selectedIndex + 1) % media.length
    onSelectIndex(next)
    emblaApi?.scrollTo(next)
  }

  if (media.length === 0) {
    return (
      <div className="bg-muted flex aspect-[4/5] items-center justify-center rounded-2xl">
        <ImageIcon className="text-muted-foreground size-16" />
      </div>
    )
  }

  return (
    <>
      {/* Desktop: static hero with overlay arrows */}
      <div className="relative hidden lg:block">
        <div className="bg-muted aspect-[4/5] overflow-hidden rounded-2xl">
          {heroItem.kind === "image" ? (
            <button
              type="button"
              onClick={onOpenLightbox}
              className="block size-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <img
                src={heroItem.url}
                alt={productTitle}
                className="size-full object-cover"
              />
            </button>
          ) : (
            <VideoPlayer item={heroItem} className="size-full object-cover" />
          )}
        </div>

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="bg-background/80 absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-background"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="bg-background/80 absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-background"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
              {selectedIndex + 1} / {media.length}
            </span>
          </>
        )}
      </div>

      {/* Mobile: swipeable carousel */}
      <div className="lg:hidden">
        <Carousel
          setApi={onApiReady}
          opts={{ startIndex: selectedIndex }}
          className="w-full"
        >
          <CarouselContent>
            {media.map((item) => (
              <CarouselItem key={`${item.kind}-${item.id}`}>
                <div className="bg-muted aspect-[4/5] overflow-hidden rounded-2xl">
                  {item.kind === "image" ? (
                    <button
                      type="button"
                      onClick={onOpenLightbox}
                      className="block size-full"
                    >
                      <img
                        src={item.url}
                        alt={productTitle}
                        className="size-full object-cover"
                      />
                    </button>
                  ) : (
                    <VideoPlayer item={item} className="size-full object-cover" />
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {media.length > 1 && (
          <div className="mt-2 text-center">
            <span className="text-muted-foreground text-xs">
              {selectedIndex + 1} / {media.length}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
