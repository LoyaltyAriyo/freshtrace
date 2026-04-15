"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PrioritySection } from "@/components/priority-section"
import { RecentAlerts } from "@/components/recent-alerts"
import type { FoodItem } from "@/lib/data"
import { Loader2, Plus, ScanLine } from "lucide-react"
import MetricCard from "@/components/ui/metric-card"

type PrioritizedResponse = {
  items: FoodItem[]
  useFirst: FoodItem[]
  useSoon: FoodItem[]
  useLater: FoodItem[]
}

export default function HomePage() {
  const [priorityData, setPriorityData] = useState<PrioritizedResponse>({
    items: [],
    useFirst: [],
    useSoon: [],
    useLater: [],
  })

  const [alerts, setAlerts] = useState<any[]>([]) // ✅ NEW

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadPrioritizedItems() {
      setLoading(true)
      setError("")

      try {
        const response = await fetch("/api/items/prioritized")
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load prioritized items.")
        }

        const nextData: PrioritizedResponse = {
          items: Array.isArray(data?.items) ? data.items : [],
          useFirst: Array.isArray(data?.useFirst) ? data.useFirst : [],
          useSoon: Array.isArray(data?.useSoon) ? data.useSoon : [],
          useLater: Array.isArray(data?.useLater) ? data.useLater : [],
        }

        if (!cancelled) {
          setPriorityData(nextData)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load prioritized items.")
          setLoading(false)
        }
      }
    }

    async function loadAlerts() {
      try {
        const res = await fetch("/api/alerts")
        const data = await res.json()
        if (!cancelled) {
          setAlerts(Array.isArray(data) ? data : [])
        }
      } catch {
        if (!cancelled) {
          setAlerts([])
        }
      }
    }

    loadPrioritizedItems()
    loadAlerts()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            What should you use next?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {priorityData.items.length} active items in your kitchen
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

      {/* Error */}
      {error && (
        <Alert variant="destructive" data-testid="priority-load-error">
          <AlertTitle>Unable to load priorities</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading priority overview...</span>
        </div>
      )}

      {/* ✅ Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          value={loading ? "..." : priorityData.items.length}
          icon={<ScanLine />}
        />

        <MetricCard
          title="Use First"
          value={loading ? "..." : priorityData.useFirst.length}
          description="High priority"
          icon={<Loader2 />}
        />

        <MetricCard
          title="Use Soon"
          value={loading ? "..." : priorityData.useSoon.length}
          description="Medium priority"
        />

        <MetricCard
          title="Use Later"
          value={loading ? "..." : priorityData.useLater.length}
          description="Low priority"
        />
      </div>

      {/* Priority Overview */}
      <section aria-label="Priority overview">
        <div className="grid gap-4 md:grid-cols-3">
          <PrioritySection priority="use-first" items={priorityData.useFirst} />
          <PrioritySection priority="use-soon" items={priorityData.useSoon} />
          <PrioritySection priority="use-later" items={priorityData.useLater} />
        </div>
      </section>

      {/* ✅ Dynamic Alerts */}
      <section aria-label="Recent alerts">
        <RecentAlerts alerts={alerts} />
      </section>
    </div>
  )
}