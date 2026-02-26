interface ProductMetadataProps {
  firstSeenAt: string
  shopifyPublishedAt: string | null
  shopifyUpdatedAt: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

export function ProductMetadata({
  firstSeenAt,
  shopifyPublishedAt,
  shopifyUpdatedAt,
}: ProductMetadataProps) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex gap-2">
        <dt className="text-muted-foreground w-24 shrink-0">First Seen</dt>
        <dd>{formatDate(firstSeenAt)}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-muted-foreground w-24 shrink-0">Published</dt>
        <dd>{shopifyPublishedAt ? formatDate(shopifyPublishedAt) : "\u2014"}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-muted-foreground w-24 shrink-0">Updated</dt>
        <dd>{shopifyUpdatedAt ? formatDate(shopifyUpdatedAt) : "\u2014"}</dd>
      </div>
    </dl>
  )
}
