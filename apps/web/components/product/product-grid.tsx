"use client"

import { useState } from "react"
import { PackageIcon, SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { ProductCard } from "./product-card"
import { ArchivedProductCard } from "./archived-product-card"
import { StylePills } from "./style-pills"
import { useProducts, type ProductFilters } from "@/hooks/use-products"
import { useProductTypes } from "@/hooks/use-product-types"
import { useArchivedProducts } from "@/hooks/use-archived-products"

type Source = "current" | "archived"

interface ProductGridProps {
  storeId: string
}

function ProductCardSkeleton() {
  return (
    <Card>
      <Skeleton className="aspect-[3/4] rounded-t-2xl" />
      <div className="space-y-2 p-6 pt-4">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-4xl" />
        </div>
      </div>
    </Card>
  )
}

export function ProductGrid({ storeId }: ProductGridProps) {
  const [source, setSource] = useState<Source>("current")
  const [search, setSearch] = useState("")
  const [stock, setStock] = useState<ProductFilters["stock"] | null>("all")
  const [sort, setSort] = useState<ProductFilters["sort"] | null>("name")
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const { types } = useProductTypes(storeId)
  const { products, isLoading: isLoadingCurrent } = useProducts(storeId, {
    search: search || undefined,
    stock: stock ?? undefined,
    sort: sort ?? undefined,
    type: selectedType ?? undefined,
  })
  const {
    products: archivedProducts,
    isLoading: isLoadingArchived,
  } = useArchivedProducts(source === "archived" ? storeId : undefined, {
    search: search || undefined,
    sort: sort === "name" || sort === "recent" ? sort : undefined,
  })

  const isLoading = source === "current" ? isLoadingCurrent : isLoadingArchived

  return (
    <div className="space-y-4">
      {/* Style pills (current only) */}
      {source === "current" && (
        <StylePills types={types} selected={selectedType} onSelect={setSelectedType} />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={source} onValueChange={(v) => setSource(v as Source)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {source === "current" && (
          <Select value={stock} onValueChange={(v) => setStock(v as ProductFilters["stock"] | null)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select
          value={sort}
          onValueChange={(v) => setSort(v as ProductFilters["sort"] | null)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            {source === "current" && (
              <>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </>
            )}
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : source === "current" ? (
        products.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>No products found</EmptyTitle>
              <EmptyDescription>
                {search || selectedType
                  ? "Try adjusting your search or filters."
                  : "Products will appear after the first sync."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                storeId={storeId}
                imageUrl={product.cachedImageUrl ?? undefined}
              />
            ))}
          </div>
        )
      ) : archivedProducts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>No archived products</EmptyTitle>
            <EmptyDescription>
              {search
                ? "Try adjusting your search."
                : "Archived products from the Wayback Machine will appear here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {archivedProducts.map((product) => (
            <ArchivedProductCard
              key={product.handle}
              product={product}
              storeId={storeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
