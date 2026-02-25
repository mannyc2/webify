"use client"

import { use } from "react"
import { RefreshCwIcon } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SyncStatus as SyncStatusType } from "@webify/db"
import { Header } from "@/components/layout/header"
import { SyncStatus } from "@/components/shared/sync-status"
import { ProductGrid } from "@/components/product/product-grid"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"
import { storeResponseSchema } from "@/lib/api/schemas"

export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>
}) {
  const { storeId } = use(params)
  const queryClient = useQueryClient()

  const { data: store } = useQuery({
    queryKey: queryKeys.stores.detail(storeId),
    queryFn: async () => {
      const res = await fetch(`/api/stores/${storeId}`)
      if (!res.ok) throw new Error("Store not found")
      const json = await res.json()
      return storeResponseSchema.parse(json)
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/stores/${storeId}/sync`, { method: "POST" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.detail(storeId) })
    },
  })

  return (
    <div className="space-y-6">
      <Header
        title={store?.name ?? "Loading..."}
        description={store?.domain}
        actions={
          <div className="flex items-center gap-3">
            {store && (
              <SyncStatus
                status={store.syncStatus as SyncStatusType}
                lastFetchedAt={store.lastFetchedAt}
              />
            )}
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <RefreshCwIcon data-icon="inline-start" className={syncMutation.isPending ? "animate-spin" : undefined} />
              {syncMutation.isPending ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        }
      />
      <ProductGrid storeId={storeId} />
    </div>
  )
}
