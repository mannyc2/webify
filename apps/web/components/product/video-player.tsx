"use client"

import { cn } from "@/lib/utils"

export type MediaItem =
  | { kind: "image"; id: number; url: string; position: number }
  | { kind: "video"; id: number; src: string; format: string; position: number; alt: string | null }

export function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([^?&/]+)/,
  )
  return match?.[1] ?? null
}

export function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

interface VideoPlayerProps {
  item: Extract<MediaItem, { kind: "video" }>
  className?: string
}

export function VideoPlayer({ item, className }: VideoPlayerProps) {
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
