"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ChangeEvent } from "@webify/db"
import { queryKeys } from "@/lib/query-keys"
import { eventsResponseSchema } from "@/lib/api/schemas"

export interface EventFilters {
  store?: string
  type?: string
  since?: string
  is_read?: boolean
  offset?: number
  limit?: number
}

async function fetchEvents(storeId: string | undefined, filters: EventFilters): Promise<ChangeEvent[]> {
  const params = new URLSearchParams()
  if (filters.store) params.set("store", filters.store)
  if (filters.type) params.set("type", filters.type)
  if (filters.since) params.set("since", filters.since)
  if (filters.is_read !== undefined) params.set("is_read", String(filters.is_read))
  if (filters.offset) params.set("offset", String(filters.offset))
  if (filters.limit) params.set("limit", String(filters.limit))

  const qs = params.toString()
  const base = storeId ? `/api/stores/${storeId}/events` : "/api/events"
  const url = `${base}${qs ? `?${qs}` : ""}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch events")
  const json = await res.json()
  return eventsResponseSchema.parse(json).data
}

export function useEvents(storeId?: string, filters: EventFilters = {}) {
  const queryClient = useQueryClient()

  const queryKey = storeId
    ? queryKeys.events.byStore(storeId, filters)
    : queryKeys.events.all(filters)

  const query = useQuery({
    queryKey,
    queryFn: () => fetchEvents(storeId, filters),
  })

  const markReadMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      })
      if (!res.ok) throw new Error("Failed to mark event as read")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async (eventIds: string[]) => {
      const res = await fetch("/api/events/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids: eventIds }),
      })
      if (!res.ok) throw new Error("Failed to mark events as read")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })

  return {
    events: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ?? undefined,
    refresh: query.refetch,
    markRead: (eventId: string) => markReadMutation.mutateAsync(eventId),
    markAllRead: (eventIds: string[]) => markAllReadMutation.mutateAsync(eventIds),
  }
}
