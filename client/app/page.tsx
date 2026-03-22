"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PrioritySection } from "@/components/priority-section"
import { RecentAlerts } from "@/components/recent-alerts"
import { sampleFoodItems, sampleAlerts } from "@/lib/data"
import { Plus, ScanLine } from "lucide-react"

export default function HomePage() {
  const activeItems = sampleFoodItems.filter((i) => i.status === "active")
  const useFirst = activeItems.filter((i) => i.priority === "use-first")
  const useSoon = activeItems.filter((i) => i.priority === "use-soon")
  const useLater = activeItems.filter((i) => i.priority === "use-later")

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            What should you use next?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeItems.length} active items in your kitchen
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/manual-entry">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Entry
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/scan">
              <ScanLine className="mr-1.5 h-4 w-4" />
              Scan Receipt
            </Link>
          </Button>
        </div>
      </div>

      {/* Priority Overview */}
      <section aria-label="Priority overview">
        <div className="grid gap-4 md:grid-cols-3">
          <PrioritySection priority="use-first" items={useFirst} />
          <PrioritySection priority="use-soon" items={useSoon} />
          <PrioritySection priority="use-later" items={useLater} />
        </div>
      </section>

      {/* Recent Alerts */}
      <section aria-label="Recent alerts">
        <RecentAlerts alerts={sampleAlerts} />
      </section>
    </div>
  )
}
