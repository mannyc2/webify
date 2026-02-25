"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { productTypesResponseSchema } from "@/lib/api/schemas"

async function fetchProductTypes(storeId: string): Promise<string[]> {
  const res = await fetch(`/api/stores/${storeId}/product-types`)
  if (!res.ok) throw new Error("Failed to fetch product types")
  const json = await res.json()
  return productTypesResponseSchema.parse(json).data
}

export function useProductTypes(storeId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.products.types(storeId!),
    queryFn: () => fetchProductTypes(storeId!),
    enabled: !!storeId,
  })

  return {
    types: query.data ?? [],
    isLoading: query.isPending,
  }
}
