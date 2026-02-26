"use client"

import { useSnapshots } from "@/hooks/use-snapshots"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface PriceSparklineProps {
  productId: number
  variantId: number
}

export function PriceSparkline({ productId, variantId }: PriceSparklineProps) {
  const { data: snapshots } = useSnapshots(productId, variantId)

  if (!snapshots || snapshots.length < 2) return null

  const recent = snapshots.slice(-14)
  const prices = recent.map((s) => parseFloat(s.price))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  // Map prices to SVG coordinates (80x32 viewBox, with 2px padding)
  const padX = 2
  const padY = 4
  const w = 80 - padX * 2
  const h = 32 - padY * 2

  const points = prices
    .map((p, i) => {
      const x = padX + (i / (prices.length - 1)) * w
      const y = padY + (1 - (p - min) / range) * h
      return `${x},${y}`
    })
    .join(" ")

  const first = prices[0]
  const last = prices[prices.length - 1]
  const strokeClass =
    last < first
      ? "text-emerald-500"
      : last > first
        ? "text-red-500"
        : "text-muted-foreground"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex">
          <svg
            viewBox="0 0 80 32"
            className={`h-8 w-20 ${strokeClass}`}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline
              points={points}
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          {recent.length} data point{recent.length !== 1 && "s"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
