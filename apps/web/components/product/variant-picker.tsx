"use client"

import { useMemo, useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface PickerVariant {
  id: number
  title: string
  available: boolean
}

interface VariantPickerProps {
  variants: PickerVariant[]
  selectedVariantId: number | null
  onSelectVariant: (id: number) => void
}

/**
 * Parse variant titles like "Red / Small" into per-dimension values.
 * Returns { dimensions: string[], matrix: Map<dimensionIndex, Set<values>> }
 */
function parseDimensions(variants: PickerVariant[]) {
  const parsed = variants.map((v) => v.title.split(" / ").map((s) => s.trim()))
  const dimCount = parsed[0]?.length ?? 0

  const dimensions: Map<number, string[]> = new Map()
  for (let d = 0; d < dimCount; d++) {
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const parts of parsed) {
      const val = parts[d]
      if (val && !seen.has(val)) {
        seen.add(val)
        ordered.push(val)
      }
    }
    dimensions.set(d, ordered)
  }

  return { dimCount, dimensions, parsed }
}

export function VariantPicker({
  variants,
  selectedVariantId,
  onSelectVariant,
}: VariantPickerProps) {
  // Skip if only 1 variant with "Default Title"
  if (variants.length <= 1 && variants[0]?.title === "Default Title") {
    return null
  }

  const { dimCount, dimensions, parsed } = useMemo(
    () => parseDimensions(variants),
    [variants],
  )

  // Track selected value per dimension
  const selectedVariant = variants.find((v) => v.id === selectedVariantId)
  const selectedParts = selectedVariant
    ? selectedVariant.title.split(" / ").map((s) => s.trim())
    : null

  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    if (selectedParts) return selectedParts
    // Default to first variant's values
    return parsed[0] ?? []
  })

  // Sync when external selection changes
  useEffect(() => {
    if (selectedParts) {
      setSelectedValues(selectedParts)
    }
  }, [selectedVariantId, selectedParts])

  function handleSelect(dimIndex: number, value: string) {
    const next = [...selectedValues]
    next[dimIndex] = value
    setSelectedValues(next)

    // Find matching variant
    const match = variants.find((v, i) => {
      const parts = parsed[i]
      return parts.every((p, d) => p === next[d])
    })
    if (match) {
      onSelectVariant(match.id)
    }
  }

  // Check if a dimension value combination is available
  function isValueAvailable(dimIndex: number, value: string): boolean {
    return variants.some((v, i) => {
      const parts = parsed[i]
      if (parts[dimIndex] !== value) return false
      // Check all other selected dimensions match
      return selectedValues.every(
        (sel, d) => d === dimIndex || parts[d] === sel,
      )
    })
  }

  // Dimension labels (heuristic: if there are known option names, use them)
  const dimensionLabels = ["Color", "Size", "Style"].slice(0, dimCount)

  if (dimCount === 1) {
    const values = dimensions.get(0) ?? []
    return (
      <div className="flex flex-wrap gap-2">
        {values.map((val) => {
          const isSelected = selectedValues[0] === val
          const available = isValueAvailable(0, val)
          return (
            <button
              key={val}
              type="button"
              onClick={() => handleSelect(0, val)}
              disabled={!available}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80",
                !available && "opacity-40 line-through",
              )}
            >
              {val}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Array.from(dimensions.entries()).map(([dimIndex, values]) => (
        <div key={dimIndex}>
          <p className="text-muted-foreground mb-1.5 text-sm font-medium">
            {dimensionLabels[dimIndex] ?? `Option ${dimIndex + 1}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {values.map((val) => {
              const isSelected = selectedValues[dimIndex] === val
              const available = isValueAvailable(dimIndex, val)
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelect(dimIndex, val)}
                  disabled={!available}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80",
                    !available && "opacity-40 line-through",
                  )}
                >
                  {val}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
