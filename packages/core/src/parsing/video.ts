import type { WaybackVideoData } from "./types";

export function detectVideoFormat(
  src: string,
  explicitFormat?: string,
): WaybackVideoData["format"] {
  if (explicitFormat) {
    const f = explicitFormat.toLowerCase();
    if (f.includes("mp4")) return "mp4";
    if (f.includes("webm")) return "webm";
    if (f.includes("m3u8") || f.includes("hls")) return "m3u8";
  }
  const url = src.toLowerCase();
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".webm")) return "webm";
  if (url.includes(".m3u8")) return "m3u8";
  return "unknown";
}

/**
 * Extract video data from Shopify's media array.
 * Handles both native Shopify videos (with sources array) and external
 * videos (YouTube/Vimeo with host field).
 */
export function extractVideos(media: any[]): WaybackVideoData[] {
  if (!Array.isArray(media)) return [];

  const videos: WaybackVideoData[] = [];

  for (const item of media) {
    const mediaType = item.media_type ?? item.type ?? "";
    if (
      typeof mediaType !== "string" ||
      !mediaType.toLowerCase().includes("video")
    ) {
      continue;
    }

    // External video (YouTube / Vimeo)
    if (item.host === "youtube" || item.host === "vimeo") {
      const src =
        item.embed_url ?? item.external_url ?? item.url ?? item.src ?? "";
      if (src) {
        videos.push({
          src,
          format: item.host === "youtube" ? "youtube" : "vimeo",
          height: typeof item.height === "number" ? item.height : null,
          alt: typeof item.alt === "string" ? item.alt : null,
        });
      }
      continue;
    }

    // Native Shopify video with sources array
    const sources = item.sources ?? item.src_set ?? [];
    if (Array.isArray(sources) && sources.length > 0) {
      for (const source of sources) {
        const src = source.url ?? source.src ?? "";
        if (!src) continue;
        videos.push({
          src,
          format: detectVideoFormat(src, source.format ?? source.mime_type),
          height:
            typeof source.height === "number"
              ? source.height
              : typeof item.height === "number"
                ? item.height
                : null,
          alt: typeof item.alt === "string" ? item.alt : null,
        });
      }
    } else {
      // Fallback: video item with a direct URL
      const src = item.url ?? item.src ?? "";
      if (src) {
        videos.push({
          src,
          format: detectVideoFormat(src),
          height: typeof item.height === "number" ? item.height : null,
          alt: typeof item.alt === "string" ? item.alt : null,
        });
      }
    }
  }

  return videos;
}

// NEW: Pure function extracted from apps/sync/src/scrape-product.ts

export interface ExistingVideo {
  id: number;
  src: string;
  isRemoved: boolean;
}

export interface VideoDiffResult {
  toInsert: { src: string; format: string; height: number | null; alt: string | null; position: number }[];
  toUpdate: { id: number; position: number; format: string; height: number | null; alt: string | null }[];
  toSoftDelete: { id: number }[];
}

export function computeVideoDiff(
  existing: ExistingVideo[],
  scraped: WaybackVideoData[],
): VideoDiffResult {
  const existingSrcMap = new Map(existing.map(v => [v.src, v]));
  const fetchedSrcs = new Set(scraped.map(v => v.src));

  const toInsert: VideoDiffResult["toInsert"] = [];
  const toUpdate: VideoDiffResult["toUpdate"] = [];
  const toSoftDelete: VideoDiffResult["toSoftDelete"] = [];

  for (let i = 0; i < scraped.length; i++) {
    const video = scraped[i];
    const existingVideo = existingSrcMap.get(video.src);
    if (existingVideo) {
      toUpdate.push({
        id: existingVideo.id,
        position: i,
        format: video.format,
        height: video.height,
        alt: video.alt,
      });
    } else {
      toInsert.push({
        src: video.src,
        format: video.format,
        height: video.height,
        alt: video.alt,
        position: i,
      });
    }
  }

  for (const existingVideo of existing) {
    if (!fetchedSrcs.has(existingVideo.src) && !existingVideo.isRemoved) {
      toSoftDelete.push({ id: existingVideo.id });
    }
  }

  return { toInsert, toUpdate, toSoftDelete };
}
