"use client"

import { useQuery } from "@tanstack/react-query"
import type { z } from "zod"
import { queryKeys } from "@/lib/query-keys"
import { productDetailSchema } from "@/lib/api/schemas"

export type ProductWithVariants = z.infer<typeof productDetailSchema>

export function useProduct(storeId: string, productId: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(Number(productId)),
    queryFn: async (): Promise<ProductWithVariants> => {
      const res = await fetch(`/api/stores/${storeId}/products/${productId}`)
      if (!res.ok) throw new Error("Product not found")
      const json = await res.json()
      return productDetailSchema.parse(json)
    },
  })
}
