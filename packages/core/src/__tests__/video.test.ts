import { describe, expect, test } from "bun:test";
import {
  detectVideoFormat,
  extractVideos,
  computeVideoDiff,
  type ExistingVideo,
} from "../parsing/video";
import type { WaybackVideoData } from "../wayback-types";

// ---------------------------------------------------------------------------
// detectVideoFormat
// ---------------------------------------------------------------------------

describe("detectVideoFormat", () => {
  test("YouTube URL", () => {
    expect(detectVideoFormat("https://www.youtube.com/watch?v=abc")).toBe("youtube");
  });

  test("Vimeo URL", () => {
    expect(detectVideoFormat("https://vimeo.com/123456")).toBe("vimeo");
  });

  test(".mp4 URL", () => {
    expect(detectVideoFormat("https://cdn.shopify.com/video.mp4")).toBe("mp4");
  });

  test(".webm URL", () => {
    expect(detectVideoFormat("https://cdn.shopify.com/video.webm")).toBe("webm");
  });

  test(".m3u8 URL", () => {
    expect(detectVideoFormat("https://cdn.shopify.com/stream.m3u8")).toBe("m3u8");
  });

  test("unknown URL", () => {
    expect(detectVideoFormat("https://cdn.shopify.com/file.dat")).toBe("unknown");
  });

  test("explicit format overrides URL detection", () => {
    expect(detectVideoFormat("https://cdn.shopify.com/video.webm", "mp4")).toBe("mp4");
    expect(detectVideoFormat("https://youtube.com/watch?v=x", "webm")).toBe("webm");
  });

  test("youtu.be short URL", () => {
    expect(detectVideoFormat("https://youtu.be/abc123")).toBe("youtube");
  });
});

// ---------------------------------------------------------------------------
// extractVideos
// ---------------------------------------------------------------------------

describe("extractVideos", () => {
  test("YouTube external video via host field", () => {
    const media = [
      {
        media_type: "external_video",
        host: "youtube",
        embed_url: "https://www.youtube.com/embed/abc",
        alt: "Demo video",
        height: 720,
      },
    ];
    const videos = extractVideos(media);
    expect(videos).toHaveLength(1);
    expect(videos[0].src).toBe("https://www.youtube.com/embed/abc");
    expect(videos[0].format).toBe("youtube");
    expect(videos[0].height).toBe(720);
    expect(videos[0].alt).toBe("Demo video");
  });

  test("Vimeo external video via host field", () => {
    const media = [
      {
        media_type: "external_video",
        host: "vimeo",
        external_url: "https://vimeo.com/123456",
        alt: null,
      },
    ];
    const videos = extractVideos(media);
    expect(videos).toHaveLength(1);
    expect(videos[0].src).toBe("https://vimeo.com/123456");
    expect(videos[0].format).toBe("vimeo");
  });

  test("native Shopify video with sources array", () => {
    const media = [
      {
        media_type: "video",
        sources: [
          { url: "https://cdn.shopify.com/video.mp4", format: "mp4", height: 1080 },
          { url: "https://cdn.shopify.com/video.webm", format: "webm", height: 720 },
        ],
        alt: "Product video",
      },
    ];
    const videos = extractVideos(media);
    expect(videos).toHaveLength(2);
    expect(videos[0].src).toBe("https://cdn.shopify.com/video.mp4");
    expect(videos[0].format).toBe("mp4");
    expect(videos[0].height).toBe(1080);
    expect(videos[1].src).toBe("https://cdn.shopify.com/video.webm");
    expect(videos[1].format).toBe("webm");
    expect(videos[1].height).toBe(720);
  });

  test("fallback: direct URL on video item", () => {
    const media = [
      {
        media_type: "video",
        url: "https://cdn.shopify.com/fallback.mp4",
        height: 480,
        alt: "Fallback",
      },
    ];
    const videos = extractVideos(media);
    expect(videos).toHaveLength(1);
    expect(videos[0].src).toBe("https://cdn.shopify.com/fallback.mp4");
    expect(videos[0].format).toBe("mp4");
    expect(videos[0].height).toBe(480);
  });

  test("non-video media items filtered out", () => {
    const media = [
      { media_type: "image", src: "https://cdn.shopify.com/photo.jpg" },
      { media_type: "video", url: "https://cdn.shopify.com/v.mp4" },
    ];
    const videos = extractVideos(media);
    expect(videos).toHaveLength(1);
    expect(videos[0].src).toBe("https://cdn.shopify.com/v.mp4");
  });

  test("non-array input returns []", () => {
    expect(extractVideos(null as any)).toEqual([]);
    expect(extractVideos(undefined as any)).toEqual([]);
    expect(extractVideos("not array" as any)).toEqual([]);
  });

  test("empty array returns []", () => {
    expect(extractVideos([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeVideoDiff
// ---------------------------------------------------------------------------

describe("computeVideoDiff", () => {
  test("new videos go to toInsert", () => {
    const existing: ExistingVideo[] = [];
    const scraped: WaybackVideoData[] = [
      { src: "https://cdn.shopify.com/new.mp4", format: "mp4", height: 720, alt: null },
    ];
    const diff = computeVideoDiff(existing, scraped);
    expect(diff.toInsert).toHaveLength(1);
    expect(diff.toInsert[0].src).toBe("https://cdn.shopify.com/new.mp4");
    expect(diff.toInsert[0].position).toBe(0);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toSoftDelete).toEqual([]);
  });

  test("existing videos go to toUpdate with correct position", () => {
    const existing: ExistingVideo[] = [
      { id: 1, src: "https://cdn.shopify.com/a.mp4", isRemoved: false },
    ];
    const scraped: WaybackVideoData[] = [
      { src: "https://cdn.shopify.com/a.mp4", format: "mp4", height: 1080, alt: "Updated" },
    ];
    const diff = computeVideoDiff(existing, scraped);
    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toUpdate[0].id).toBe(1);
    expect(diff.toUpdate[0].position).toBe(0);
    expect(diff.toInsert).toEqual([]);
    expect(diff.toSoftDelete).toEqual([]);
  });

  test("removed videos go to toSoftDelete", () => {
    const existing: ExistingVideo[] = [
      { id: 1, src: "https://cdn.shopify.com/old.mp4", isRemoved: false },
    ];
    const scraped: WaybackVideoData[] = [];
    const diff = computeVideoDiff(existing, scraped);
    expect(diff.toSoftDelete).toHaveLength(1);
    expect(diff.toSoftDelete[0].id).toBe(1);
    expect(diff.toInsert).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
  });

  test("already-removed videos NOT in toSoftDelete", () => {
    const existing: ExistingVideo[] = [
      { id: 1, src: "https://cdn.shopify.com/old.mp4", isRemoved: true },
    ];
    const scraped: WaybackVideoData[] = [];
    const diff = computeVideoDiff(existing, scraped);
    expect(diff.toSoftDelete).toEqual([]);
  });

  test("mix of inserts, updates, soft-deletes", () => {
    const existing: ExistingVideo[] = [
      { id: 1, src: "https://cdn.shopify.com/keep.mp4", isRemoved: false },
      { id: 2, src: "https://cdn.shopify.com/remove.mp4", isRemoved: false },
      { id: 3, src: "https://cdn.shopify.com/already-gone.mp4", isRemoved: true },
    ];
    const scraped: WaybackVideoData[] = [
      { src: "https://cdn.shopify.com/new.mp4", format: "mp4", height: null, alt: null },
      { src: "https://cdn.shopify.com/keep.mp4", format: "mp4", height: 720, alt: null },
    ];
    const diff = computeVideoDiff(existing, scraped);
    expect(diff.toInsert).toHaveLength(1);
    expect(diff.toInsert[0].src).toBe("https://cdn.shopify.com/new.mp4");
    expect(diff.toInsert[0].position).toBe(0);
    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toUpdate[0].id).toBe(1);
    expect(diff.toUpdate[0].position).toBe(1);
    expect(diff.toSoftDelete).toHaveLength(1);
    expect(diff.toSoftDelete[0].id).toBe(2);
  });

  test("empty existing + non-empty scraped: all inserts", () => {
    const scraped: WaybackVideoData[] = [
      { src: "https://cdn.shopify.com/a.mp4", format: "mp4", height: null, alt: null },
      { src: "https://cdn.shopify.com/b.mp4", format: "mp4", height: null, alt: null },
    ];
    const diff = computeVideoDiff([], scraped);
    expect(diff.toInsert).toHaveLength(2);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toSoftDelete).toEqual([]);
  });

  test("non-empty existing + empty scraped: all soft-deletes", () => {
    const existing: ExistingVideo[] = [
      { id: 1, src: "https://cdn.shopify.com/a.mp4", isRemoved: false },
      { id: 2, src: "https://cdn.shopify.com/b.mp4", isRemoved: false },
    ];
    const diff = computeVideoDiff(existing, []);
    expect(diff.toInsert).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toSoftDelete).toHaveLength(2);
  });
});
