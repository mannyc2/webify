"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChangeType } from "@webify/db"
import type { Store } from "@webify/db"

interface ActivityFiltersProps {
  stores: Store[]
  selectedStore: string | null
  onStoreChange: (value: string | null) => void
  selectedType: string | null
  onTypeChange: (value: string | null) => void
}

const changeTypes = [
  { value: "all", label: "All Types" },
  { value: ChangeType.priceDropped, label: "Price Dropped" },
  { value: ChangeType.priceIncreased, label: "Price Increased" },
  { value: ChangeType.backInStock, label: "Back in Stock" },
  { value: ChangeType.outOfStock, label: "Out of Stock" },
  { value: ChangeType.newProduct, label: "New Product" },
  { value: ChangeType.productRemoved, label: "Product Removed" },
  { value: ChangeType.imagesChanged, label: "Images Changed" },
]

export function ActivityFilters({
  stores,
  selectedStore,
  onStoreChange,
  selectedType,
  onTypeChange,
}: ActivityFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedStore} onValueChange={onStoreChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stores</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.domain} value={store.domain}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {changeTypes.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
