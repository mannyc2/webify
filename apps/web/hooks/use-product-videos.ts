"use client"

import { useQuery } from "@tanstack/react-query"
import type { z } from "zod"
import { queryKeys } from "@/lib/query-keys"
import { videosResponseSchema } from "@/lib/api/schemas"

export type ProductVideo = z.infer<typeof videosResponseSchema>["data"][number]

async function fetchProductVideos(productId: number): Promise<ProductVideo[]> {
  const res = await fetch(`/api/products/${productId}/videos`)
  if (!res.ok) throw new Error("Failed to fetch product videos")
  const json = await res.json()
  return videosResponseSchema.parse(json).data
}

export function useProductVideos(productId: number | undefined) {
  const query = useQuery({
    queryKey: queryKeys.videos.byProduct(productId!),
    queryFn: () => fetchProductVideos(productId!),
    enabled: !!productId,
  })

  return {
    videos: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ?? undefined,
  }
}
