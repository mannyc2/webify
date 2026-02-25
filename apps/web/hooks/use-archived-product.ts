"use client"

import { useQuery } from "@tanstack/react-query"
import type { z } from "zod"
import { queryKeys } from "@/lib/query-keys"
import { archivedProductDetailSchema } from "@/lib/api/schemas"

export type ArchivedProductDetail = z.infer<typeof archivedProductDetailSchema>

async function fetchArchivedProduct(storeId: string, handle: string): Promise<ArchivedProductDetail> {
  const res = await fetch(`/api/stores/${storeId}/archived-products/${handle}`)
  if (!res.ok) throw new Error("Archived product not found")
  const json = await res.json()
  return archivedProductDetailSchema.parse(json)
}

export function useArchivedProduct(storeId: string | undefined, handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.archivedProducts.detail(storeId!, handle!),
    queryFn: () => fetchArchivedProduct(storeId!, handle!),
    enabled: !!storeId && !!handle,
  })
}
