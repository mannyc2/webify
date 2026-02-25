import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { VariantRow } from "@/components/product/variant-row"
import type { Variant } from "@webify/db"

interface VariantTableProps {
  variants: Variant[]
  selectedVariantId: number | null
  onSelectVariant: (id: number) => void
}

export function VariantTable({
  variants,
  selectedVariantId,
  onSelectVariant,
}: VariantTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Compare At</TableHead>
          <TableHead>Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            isSelected={variant.id === selectedVariantId}
            onSelect={onSelectVariant}
          />
        ))}
      </TableBody>
    </Table>
  )
}
