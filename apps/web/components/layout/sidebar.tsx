"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Store, Activity, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1 p-3", className)}>
      <div className="mb-4 px-3 py-2">
        <h1 className="text-lg font-semibold tracking-tight">Webify</h1>
      </div>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
