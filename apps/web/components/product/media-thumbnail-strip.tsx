"use client"

import { Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface MediaThumbnailStripProps {
  media: Array<
    | { kind: "image"; id: number; url: string }
    | { kind: "video"; id: number }
  >
  selectedIndex: number
  onSelect: (index: number) => void
}

export function MediaThumbnailStrip({
  media,
  selectedIndex,
  onSelect,
}: MediaThumbnailStripProps) {
  if (media.length <= 1) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {media.map((item, i) => (
        <button
          key={`${item.kind}-${item.id}`}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "bg-muted size-14 shrink-0 overflow-hidden rounded-xl transition-opacity md:size-16 lg:size-20",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            i === selectedIndex
              ? "ring-primary ring-2 ring-offset-2"
              : "opacity-70 hover:opacity-100",
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
              <Play className="text-muted-foreground size-5 fill-current" />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
