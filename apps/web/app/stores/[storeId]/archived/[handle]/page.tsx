"use client"

import { useParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ImageGallery } from "@/components/product/image-gallery"
import { ArchiveBadge } from "@/components/shared/archive-badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useArchivedProduct } from "@/hooks/use-archived-product"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function ArchivedProductDetailPage() {
  const { storeId, handle } = useParams<{ storeId: string; handle: string }>()
  const { data: product, isPending, error } = useArchivedProduct(storeId, handle)

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-[3/4] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return <p className="text-muted-foreground py-8 text-center">Archived product not found.</p>
  }

  // Build images array for ImageGallery (needs id, url, position)
  const galleryImages = product.images.map((url, i) => ({
    id: i,
    url,
    position: i,
  }))

  return (
    <div className="space-y-8">
      <Header title={product.title} />

      {/* Two-column: gallery + info */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ImageGallery images={galleryImages} productTitle={product.title} />

        <div className="space-y-4">
          {/* Price + badge */}
          <div>
            <div className="flex items-baseline gap-3">
              {product.rawPrice ? (
                <span className="text-3xl font-semibold tabular-nums">
                  {product.rawPrice.startsWith("$") ? product.rawPrice : `$${product.rawPrice}`}
                </span>
              ) : (
                <span className="text-muted-foreground text-lg">No price recorded</span>
              )}
              <ArchiveBadge />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Last seen {formatDate(product.capturedAt)}
            </p>
          </div>

          <Separator />

          {/* Metadata */}
          <dl className="text-sm space-y-2">
            {product.vendor && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-24 shrink-0">Vendor</dt>
                <dd>{product.vendor}</dd>
              </div>
            )}
            {product.productType && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-24 shrink-0">Type</dt>
                <dd>{product.productType}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">Handle</dt>
              <dd className="font-mono text-xs">{product.handle}</dd>
            </div>
          </dl>

          <Separator />

          {/* Variants (read-only) */}
          {product.variants.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Variants</h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell>{String(v.title ?? v.name ?? `Variant ${i + 1}`)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {v.price != null ? `$${v.price}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline tab */}
      {product.timeline.length > 1 && (
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">
              Timeline ({product.timeline.length} snapshots)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Strategy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.timeline.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatDate(entry.capturedAt)}
                          </TableCell>
                          <TableCell>{entry.title ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.rawPrice ? (
                              entry.rawPrice.startsWith("$") ? entry.rawPrice : `$${entry.rawPrice}`
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {entry.extractionStrategy ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
