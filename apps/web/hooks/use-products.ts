"use client"

import { useQuery } from "@tanstack/react-query"
import type { Product } from "@webify/db"
import { queryKeys } from "@/lib/query-keys"
import { productsResponseSchema } from "@/lib/api/schemas"

export interface ProductFilters {
  search?: string
  stock?: "all" | "in" | "out"
  sort?: "name" | "price_asc" | "price_desc" | "recent"
  offset?: number
  limit?: number
}

async function fetchProducts(storeId: string, filters: ProductFilters): Promise<Product[]> {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.stock && filters.stock !== "all") params.set("stock", filters.stock)
  if (filters.sort) params.set("sort", filters.sort)
  if (filters.offset) params.set("offset", String(filters.offset))
  if (filters.limit) params.set("limit", String(filters.limit))

  const qs = params.toString()
  const url = `/api/stores/${storeId}/products${qs ? `?${qs}` : ""}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch products")
  const json = await res.json()
  return productsResponseSchema.parse(json).data
}

export function useProducts(storeId: string | undefined, filters: ProductFilters = {}) {
  const query = useQuery({
    queryKey: queryKeys.products.byStore(storeId!, filters),
    queryFn: () => fetchProducts(storeId!, filters),
    enabled: !!storeId,
  })

  return {
    products: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ?? undefined,
    refresh: query.refetch,
    total: query.data?.length ?? 0,
  }
}
