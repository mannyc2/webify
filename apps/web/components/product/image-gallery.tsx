"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
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

interface ProductImage {
  id: number
  url: string
  position: number
}

interface ImageGalleryProps {
  images: ProductImage[]
  productTitle: string
}

export function ImageGallery({ images, productTitle }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()

  const heroImage = images[selectedIndex]

  // Sync carousel slide index back to thumbnail strip
  function onCarouselApiReady(api: CarouselApi) {
    setCarouselApi(api)
    api?.on("select", () => {
      setSelectedIndex(api.selectedScrollSnap())
    })
  }

  function openLightbox() {
    setLightboxOpen(true)
    // Jump carousel to the currently selected thumbnail
    setTimeout(() => carouselApi?.scrollTo(selectedIndex, true), 0)
  }

  if (images.length === 0) {
    return (
      <div className="bg-muted flex aspect-[3/4] items-center justify-center rounded-2xl">
        <ImageIcon className="text-muted-foreground size-16" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Hero image */}
      <button
        type="button"
        onClick={openLightbox}
        className="bg-muted block w-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <img
          src={heroImage.url}
          alt={productTitle}
          className="aspect-[3/4] w-full object-cover"
        />
      </button>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "bg-muted size-20 shrink-0 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                i === selectedIndex && "ring-primary ring-2",
              )}
            >
              <img
                src={img.url}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-3xl p-2">
          <Carousel setApi={onCarouselApiReady} opts={{ startIndex: selectedIndex }}>
            <CarouselContent>
              {images.map((img) => (
                <CarouselItem key={img.id}>
                  <img
                    src={img.url}
                    alt={productTitle}
                    className="w-full rounded-xl object-contain"
                  />
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
