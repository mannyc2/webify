"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { queueStatusResponseSchema } from "@/lib/api/schemas"

export function useQueueStatus() {
  const query = useQuery({
    queryKey: queryKeys.admin.queueStatus,
    queryFn: async () => {
      const res = await fetch("/api/admin/queue-status")
      if (!res.ok) throw new Error("Failed to fetch queue status")
      return queueStatusResponseSchema.parse(await res.json())
    },
    refetchInterval: 10_000,
  })

  return {
    data: query.data,
    isLoading: query.isPending,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
  }
}
