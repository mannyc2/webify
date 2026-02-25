"use client"

import { Header } from "@/components/layout/header"
import { StoreList } from "@/components/store/store-list"
import { AddStoreDialog } from "@/components/store/add-store-dialog"
import { useStores } from "@/hooks/use-stores"

export default function StoresPage() {
  const { stores, isLoading, addStore } = useStores()

  return (
    <div className="space-y-6">
      <Header
        title="Stores"
        description="Shopify stores you are monitoring."
        actions={<AddStoreDialog onAdd={addStore} />}
      />
      <StoreList
        stores={stores}
        isLoading={isLoading}
        emptyAction={<AddStoreDialog onAdd={addStore} />}
      />
    </div>
  )
}
