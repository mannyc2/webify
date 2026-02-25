"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useSnapshots } from "@/hooks/use-snapshots"

interface PriceHistoryChartProps {
  productId: number
  variantId: number
}

const chartConfig = {
  price: {
    label: "Price",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function PriceHistoryChart({ productId, variantId }: PriceHistoryChartProps) {
  const { data: snapshots, isPending } = useSnapshots(productId, variantId)

  if (isPending) {
    return (
      <div className="bg-muted flex h-[300px] items-center justify-center rounded-xl">
        <span className="text-muted-foreground text-sm">Loading chart...</span>
      </div>
    )
  }

  if (!snapshots || snapshots.length < 2) {
    return (
      <div className="bg-muted flex h-[300px] items-center justify-center rounded-xl">
        <span className="text-muted-foreground text-sm">
          Not enough data for a price chart yet.
        </span>
      </div>
    )
  }

  const chartData = snapshots.map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: parseFloat(s.price),
  }))

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v: number) => `$${v}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Price"]}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--color-price)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
