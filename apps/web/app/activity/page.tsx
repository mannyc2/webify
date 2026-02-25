"use client"

import { useState } from "react"
import { CheckCheckIcon } from "lucide-react"
import { Header } from "@/components/layout/header"
import { ActivityFeed } from "@/components/activity/activity-feed"
import { ActivityFilters } from "@/components/activity/activity-filters"
import { Button } from "@/components/ui/button"
import { useEvents } from "@/hooks/use-events"
import { useStores } from "@/hooks/use-stores"

export default function ActivityPage() {
  const [selectedStore, setSelectedStore] = useState<string | null>("all")
  const [selectedType, setSelectedType] = useState<string | null>("all")

  const { stores } = useStores()
  const { events, isLoading, markRead, markAllRead } = useEvents(undefined, {
    store: !selectedStore || selectedStore === "all" ? undefined : selectedStore,
    type: !selectedType || selectedType === "all" ? undefined : selectedType,
  })

  const unreadIds = events.filter((e) => !e.isRead).map((e) => e.id)

  return (
    <div className="space-y-6">
      <Header
        title="Activity"
        description="Price and stock changes across your stores."
        actions={
          unreadIds.length > 0 ? (
            <Button variant="outline" onClick={() => markAllRead(unreadIds)}>
              <CheckCheckIcon data-icon="inline-start" />
              Mark All Read
            </Button>
          ) : undefined
        }
      />
      <ActivityFilters
        stores={stores}
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />
      <ActivityFeed
        events={events}
        isLoading={isLoading}
        onMarkRead={markRead}
      />
    </div>
  )
}
