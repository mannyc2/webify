"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { snapshotsResponseSchema } from "@/lib/api/schemas"

export function useSnapshots(productId: number, variantId: number) {
  return useQuery({
    queryKey: queryKeys.snapshots.byVariant(productId, variantId),
    queryFn: async () => {
      const res = await fetch(
        `/api/products/${productId}/variants/${variantId}/snapshots`,
      )
      if (!res.ok) throw new Error("Failed to fetch snapshots")
      const json = await res.json()
      return snapshotsResponseSchema.parse(json).data
    },
    refetchInterval: false,
  })
}
