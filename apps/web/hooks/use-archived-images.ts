"use client"

import { useQuery } from "@tanstack/react-query"
import type { z } from "zod"
import { queryKeys } from "@/lib/query-keys"
import { archivedImagesResponseSchema } from "@/lib/api/schemas"

export type ArchivedImage = z.infer<typeof archivedImagesResponseSchema>["data"][number]

async function fetchArchivedImages(storeId: string, productId: number): Promise<ArchivedImage[]> {
  const res = await fetch(`/api/stores/${storeId}/products/${productId}/archived-images`)
  if (!res.ok) throw new Error("Failed to fetch archived images")
  const json = await res.json()
  return archivedImagesResponseSchema.parse(json).data
}

export function useArchivedImages(storeId: string | undefined, productId: number | undefined) {
  const query = useQuery({
    queryKey: queryKeys.archivedImages.byProduct(storeId!, productId!),
    queryFn: () => fetchArchivedImages(storeId!, productId!),
    enabled: !!storeId && !!productId,
  })

  return {
    images: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ?? undefined,
  }
}
