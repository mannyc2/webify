"use client"

import { cn } from "@/lib/utils"

interface StylePillsProps {
  types: string[]
  selected: string | null
  onSelect: (type: string | null) => void
}

export function StylePills({ types, selected, onSelect }: StylePillsProps) {
  if (types.length === 0) return null

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            selected === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          )}
        >
          All
        </button>
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              selected === type
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  )
}
