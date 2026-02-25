"use client"

import { useMemo, useState } from "react"
import { ImageIcon, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import type { ProductVideo } from "@/hooks/use-product-videos"

interface ProductImage {
  id: number
  url: string
  position: number
}

type MediaItem =
  | { kind: "image"; id: number; url: string; position: number }
  | { kind: "video"; id: number; src: string; format: string; position: number; alt: string | null }

interface ImageGalleryProps {
  images: ProductImage[]
  videos?: ProductVideo[]
  productTitle: string
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&/]+)/,
  )
  return match?.[1] ?? null
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

function VideoPlayer({ item, className }: { item: Extract<MediaItem, { kind: "video" }>; className?: string }) {
  if (item.format === "youtube") {
    const videoId = getYouTubeId(item.src)
    if (!videoId) return null
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={item.alt ?? "Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={cn("aspect-video w-full", className)}
      />
    )
  }

  if (item.format === "vimeo") {
    const videoId = getVimeoId(item.src)
    if (!videoId) return null
    return (
      <iframe
        src={`https://player.vimeo.com/video/${videoId}`}
        title={item.alt ?? "Video"}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className={cn("aspect-video w-full", className)}
      />
    )
  }

  return (
    <video
      controls
      muted
      preload="metadata"
      className={cn("aspect-video w-full", className)}
    >
      <source src={item.src} />
    </video>
  )
}

export function ImageGallery({ images, videos = [], productTitle }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()

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

  const heroItem = media[selectedIndex]

  function onCarouselApiReady(api: CarouselApi) {
    setCarouselApi(api)
    api?.on("select", () => {
      setSelectedIndex(api.selectedScrollSnap())
    })
  }

  function openLightbox() {
    setLightboxOpen(true)
    setTimeout(() => carouselApi?.scrollTo(selectedIndex, true), 0)
  }

  if (media.length === 0) {
    return (
      <div className="bg-muted flex aspect-[3/4] items-center justify-center rounded-2xl">
        <ImageIcon className="text-muted-foreground size-16" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Hero area */}
      {heroItem.kind === "image" ? (
        <button
          type="button"
          onClick={openLightbox}
          className="bg-muted block w-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <img
            src={heroItem.url}
            alt={productTitle}
            className="aspect-[3/4] w-full object-cover"
          />
        </button>
      ) : (
        <div className="bg-muted overflow-hidden rounded-2xl">
          <VideoPlayer item={heroItem} className="rounded-2xl" />
        </div>
      )}

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {media.map((item, i) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "bg-muted size-20 shrink-0 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                i === selectedIndex && "ring-primary ring-2",
              )}
            >
              {item.kind === "image" ? (
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <div className="bg-muted-foreground/20 flex size-full items-center justify-center">
                  <Play className="text-muted-foreground size-6 fill-current" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-3xl p-2">
          <Carousel setApi={onCarouselApiReady} opts={{ startIndex: selectedIndex }}>
            <CarouselContent>
              {media.map((item) => (
                <CarouselItem key={`${item.kind}-${item.id}`}>
                  {item.kind === "image" ? (
                    <img
                      src={item.url}
                      alt={productTitle}
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
    </div>
  )
}
