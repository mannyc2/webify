"use client"

import { useState, type ReactNode } from "react"
import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="border-border hidden w-56 shrink-0 border-e md:block">
        <Sidebar className="sticky top-0" />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed start-3 top-3 z-40 md:hidden"
            />
          }
        >
          <MenuIcon />
          <span className="sr-only">Open menu</span>
        </SheetTrigger>
        <SheetContent side="left" showCloseButton={false} className="w-56 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8">
        {children}
      </main>
    </div>
  )
}
