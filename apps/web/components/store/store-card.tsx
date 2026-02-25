import Link from "next/link"
import { Store as StoreIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import type { Store, SyncStatus as SyncStatusType } from "@webify/db"
import { SyncStatus } from "@/components/shared/sync-status"

interface StoreCardProps {
  store: Store
}

export function StoreCard({ store }: StoreCardProps) {
  const previewUrls: string[] = (() => {
    try {
      return JSON.parse(store.cachedPreviewImageUrls)
    } catch {
      return []
    }
  })()

  return (
    <Link href={`/stores/${store.domain}`} className="block">
      <Card className="transition-shadow hover:ring-2 hover:ring-ring/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-9 items-center justify-center rounded-xl">
              <StoreIcon className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{store.name}</CardTitle>
              <CardDescription className="truncate">{store.domain}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {previewUrls.length > 0 && (
            <div className="flex gap-2">
              {previewUrls.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  loading="lazy"
                  className="bg-muted size-12 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {store.cachedProductCount} product{store.cachedProductCount !== 1 ? "s" : ""}
            </span>
            <SyncStatus
              status={store.syncStatus as SyncStatusType}
              lastFetchedAt={store.lastFetchedAt}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
