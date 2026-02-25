import type { ProductFilters } from "@/hooks/use-products"
import type { EventFilters } from "@/hooks/use-events"

export const queryKeys = {
  stores: {
    all: ["stores"] as const,
    detail: (domain: string) => ["stores", domain] as const,
  },
  products: {
    byStore: (storeDomain: string, filters?: ProductFilters) =>
      ["products", storeDomain, filters] as const,
    detail: (productId: number) => ["products", "detail", productId] as const,
  },
  events: {
    all: (filters?: EventFilters) => ["events", filters] as const,
    byStore: (storeDomain: string, filters?: EventFilters) =>
      ["events", storeDomain, filters] as const,
  },
  snapshots: {
    byVariant: (productId: number, variantId: number) =>
      ["snapshots", productId, variantId] as const,
  },
} as const
