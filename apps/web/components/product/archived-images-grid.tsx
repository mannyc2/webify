"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import type { ArchivedImage } from "@/hooks/use-archived-images"

function formatDateRange(firstSeen: string, lastSeen: string) {
  const fmt = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }
  const first = fmt(firstSeen)
  const last = fmt(lastSeen)
  return first === last ? first : `${first} – ${last}`
}

interface ArchivedImagesGridProps {
  images: ArchivedImage[]
  productTitle: string
}

export function ArchivedImagesGrid({ images, productTitle }: ArchivedImagesGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()

  function onCarouselApiReady(api: CarouselApi) {
    setCarouselApi(api)
    api?.on("select", () => {
      setSelectedIndex(api.selectedScrollSnap())
    })
  }

  function openLightbox(index: number) {
    setSelectedIndex(index)
    setLightboxOpen(true)
    setTimeout(() => carouselApi?.scrollTo(index, true), 0)
  }

  if (images.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No archived images found for this product.
      </p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => openLightbox(i)}
            className="group space-y-2 text-left"
          >
            <div className="bg-muted overflow-hidden rounded-lg">
              <img
                src={img.url}
                alt={`Archived image of ${productTitle}`}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {formatDateRange(img.firstSeen, img.lastSeen)}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-3xl p-2">
          <Carousel setApi={onCarouselApiReady} opts={{ startIndex: selectedIndex }}>
            <CarouselContent>
              {images.map((img) => (
                <CarouselItem key={img.url}>
                  <div className="space-y-2">
                    <img
                      src={img.url}
                      alt={productTitle}
                      className="w-full rounded-xl object-contain"
                    />
                    <p className="text-muted-foreground text-center text-xs">
                      Seen {formatDateRange(img.firstSeen, img.lastSeen)}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </DialogContent>
      </Dialog>
    </>
  )
}
