"use client"

import { useQuery } from "@tanstack/react-query"
import type { z } from "zod"
import { queryKeys } from "@/lib/query-keys"
import { archivedProductsResponseSchema } from "@/lib/api/schemas"

export type ArchivedProduct = z.infer<typeof archivedProductsResponseSchema>["data"][number]

export interface ArchivedProductFilters {
  search?: string
  sort?: "name" | "recent"
  offset?: number
  limit?: number
}

async function fetchArchivedProducts(storeId: string, filters: ArchivedProductFilters) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.sort) params.set("sort", filters.sort)
  if (filters.offset) params.set("offset", String(filters.offset))
  if (filters.limit) params.set("limit", String(filters.limit))

  const qs = params.toString()
  const url = `/api/stores/${storeId}/archived-products${qs ? `?${qs}` : ""}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch archived products")
  const json = await res.json()
  return archivedProductsResponseSchema.parse(json)
}

export function useArchivedProducts(storeId: string | undefined, filters: ArchivedProductFilters = {}) {
  const query = useQuery({
    queryKey: queryKeys.archivedProducts.byStore(storeId!, filters),
    queryFn: () => fetchArchivedProducts(storeId!, filters),
    enabled: !!storeId,
  })

  return {
    products: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending,
    error: query.error ?? undefined,
  }
}
