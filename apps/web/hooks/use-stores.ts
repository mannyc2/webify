"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Store } from "@webify/db"
import { queryKeys } from "@/lib/query-keys"
import { storesResponseSchema, storeResponseSchema } from "@/lib/api/schemas"

async function fetchStores(): Promise<Store[]> {
  const res = await fetch("/api/stores")
  if (!res.ok) throw new Error("Failed to fetch stores")
  const json = await res.json()
  return storesResponseSchema.parse(json).data
}

export function useStores() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.stores.all,
    queryFn: fetchStores,
  })

  const addMutation = useMutation({
    mutationFn: async ({ domain, name }: { domain: string; name?: string }) => {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, name }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message ?? "Failed to add store")
      }
      return storeResponseSchema.parse(await res.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch(`/api/stores/${domain}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete store")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all })
    },
  })

  return {
    stores: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ?? undefined,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores.all }),
    addStore: (domain: string, name?: string) => addMutation.mutateAsync({ domain, name }),
    deleteStore: (domain: string) => deleteMutation.mutateAsync(domain),
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
