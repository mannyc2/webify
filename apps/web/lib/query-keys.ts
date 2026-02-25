import type { ProductFilters } from "@/hooks/use-products"
import type { EventFilters } from "@/hooks/use-events"
import type { ArchivedProductFilters } from "@/hooks/use-archived-products"

export const queryKeys = {
  stores: {
    all: ["stores"] as const,
    detail: (domain: string) => ["stores", domain] as const,
  },
  products: {
    byStore: (storeDomain: string, filters?: ProductFilters) =>
      ["products", storeDomain, filters] as const,
    detail: (productId: number) => ["products", "detail", productId] as const,
    types: (storeDomain: string) => ["products", "types", storeDomain] as const,
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
  archivedImages: {
    byProduct: (storeId: string, productId: number) =>
      ["archivedImages", storeId, productId] as const,
  },
  archivedProducts: {
    byStore: (storeId: string, filters?: ArchivedProductFilters) =>
      ["archivedProducts", storeId, filters] as const,
    detail: (storeId: string, handle: string) =>
      ["archivedProducts", "detail", storeId, handle] as const,
  },
  videos: {
    byProduct: (productId: number) =>
      ["videos", productId] as const,
  },
  admin: {
    queueStatus: ["admin", "queue-status"] as const,
  },
} as const
