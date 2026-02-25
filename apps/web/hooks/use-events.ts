"use client"

import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { ChangeEvent, ChangeType } from "@webify/db"
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

export interface EventSummary {
  unreadCount: number
  todayCounts: Partial<Record<ChangeType, number>>
  headline: ChangeEvent | null
}

const MAGNITUDE_ORDER: Record<string, number> = { large: 0, medium: 1, small: 2 }

export function sortByMagnitude(events: ChangeEvent[]): ChangeEvent[] {
  return [...events].sort((a, b) => {
    const magDiff =
      (MAGNITUDE_ORDER[a.magnitude] ?? 1) - (MAGNITUDE_ORDER[b.magnitude] ?? 1)
    if (magDiff !== 0) return magDiff
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  })
}

function computeSummary(events: ChangeEvent[]): EventSummary {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let unreadCount = 0
  const todayCounts: Partial<Record<ChangeType, number>> = {}
  let headline: ChangeEvent | null = null

  for (const event of events) {
    if (!event.isRead) {
      unreadCount++
      if (
        !headline ||
        (MAGNITUDE_ORDER[event.magnitude] ?? 1) <
          (MAGNITUDE_ORDER[headline.magnitude] ?? 1) ||
        ((MAGNITUDE_ORDER[event.magnitude] ?? 1) ===
          (MAGNITUDE_ORDER[headline.magnitude] ?? 1) &&
          new Date(event.occurredAt) > new Date(headline.occurredAt))
      ) {
        headline = event
      }
    }

    if (new Date(event.occurredAt) >= today) {
      const ct = event.changeType as ChangeType
      todayCounts[ct] = (todayCounts[ct] ?? 0) + 1
    }
  }

  return { unreadCount, todayCounts, headline }
}

async function fetchEvents(
  storeId: string | undefined,
  filters: EventFilters,
): Promise<ChangeEvent[]> {
  const params = new URLSearchParams()
  if (filters.store) params.set("store", filters.store)
  if (filters.type) params.set("type", filters.type)
  if (filters.since) params.set("since", filters.since)
  if (filters.is_read !== undefined) params.set("is_read", String(filters.is_read))
  if (filters.offset) params.set("offset", String(filters.offset))
  if (filters.limit) params.set("limit", String(filters.limit))

  const qs = params.toString()
  const base = storeId ? `/api/stores/${storeId}/changes` : "/api/changes"
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

  const events = query.data ?? []
  const summary = useMemo(() => computeSummary(events), [events])

  const markReadMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/changes/${eventId}`, {
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
      const res = await fetch("/api/changes/mark-read", {
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
    events,
    summary,
    isLoading: query.isPending,
    error: query.error ?? undefined,
    refresh: query.refetch,
    markRead: (eventId: string) => markReadMutation.mutateAsync(eventId),
    markAllRead: (eventIds: string[]) => markAllReadMutation.mutateAsync(eventIds),
  }
}
