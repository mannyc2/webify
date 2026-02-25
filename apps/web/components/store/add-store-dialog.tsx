"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddStoreDialogProps {
  onAdd: (domain: string, name?: string) => Promise<unknown>
}

export function AddStoreDialog({ onAdd }: AddStoreDialogProps) {
  const [open, setOpen] = useState(false)
  const [domain, setDomain] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const trimmed = domain.trim()
    if (!trimmed) {
      setError("Domain is required")
      return
    }

    // Basic domain validation
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(trimmed)) {
      setError("Please enter a valid domain (e.g. store.myshopify.com)")
      return
    }

    setSubmitting(true)
    try {
      await onAdd(trimmed, name.trim() || undefined)
      setDomain("")
      setName("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add store")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button />}
      >
        <PlusIcon data-icon="inline-start" />
        Add Store
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Shopify Store</DialogTitle>
          <DialogDescription>
            Enter the domain of a Shopify store to start monitoring it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="store.myshopify.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Display Name (optional)</Label>
            <Input
              id="name"
              placeholder="My Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
