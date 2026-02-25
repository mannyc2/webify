import { SettingsIcon } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Header title="Settings" />
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SettingsIcon />
          </EmptyMedia>
          <EmptyTitle>Settings coming soon</EmptyTitle>
          <EmptyDescription>Notification preferences, sync frequency, and more.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
